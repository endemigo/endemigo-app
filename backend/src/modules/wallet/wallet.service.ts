import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LedgerAccountType, LedgerDirection, LedgerReferenceType } from '@endemigo/shared/enums';
import { NotificationEventType, PayoutRequestStatus, RC } from '@endemigo/shared';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { HoldStatus } from '../../shared/types/hold-status.enum';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationService } from '../notification/notification.service';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { ReviewPayoutDto } from './dto/review-payout.dto';
import { PayoutRequest } from './entities/payout-request.entity';
import { WalletHold } from './entities/wallet-hold.entity';
import { Wallet } from './entities/wallet.entity';

export interface WalletHistoryFilters {
  limit?: number;
  type?: string;
}

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletHold)
    private readonly holdRepo: Repository<WalletHold>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRequestRepo: Repository<PayoutRequest>,
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
    @Optional()
    private readonly notificationService?: NotificationService,
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  async getOrCreateWallet(userId: string): Promise<Wallet> {
    let wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      wallet = this.walletRepo.create({ userId, balance: 10000, heldAmount: 0 });
      wallet = await this.walletRepo.save(wallet);
    }
    return wallet;
  }

  async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const balance = Number(wallet.balance);
    const held = Number(wallet.heldAmount);
    return {
      code: RC.BALANCE_FETCHED,
      message: 'Wallet balance fetched',
      balance,
      held,
      available: balance - held,
      walletId: wallet.id,
    };
  }

  async createHold(auctionId: string, userId: string, amount: number): Promise<WalletHold> {
    return this.withTransaction(async (manager) => {
      const wallet = await this.getOrCreateLockedWallet(userId, manager);
      const available = Number(wallet.balance) - Number(wallet.heldAmount);

      if (available < amount) {
        throw new BadRequestException({
          code: RC.INSUFFICIENT_BALANCE,
          message: `Insufficient balance. Available: ${available.toFixed(2)}, required: ${amount.toFixed(2)}`,
        });
      }

      const existingHold = await manager.findOne(WalletHold, {
        where: { auctionId, userId, status: HoldStatus.HELD },
        lock: { mode: 'pessimistic_write' },
      });
      if (existingHold) {
        return existingHold;
      }

      const hold = manager.create(WalletHold, {
        walletId: wallet.id,
        auctionId,
        userId,
        amount,
        status: HoldStatus.HELD,
        idempotencyKey: `wallet-hold:${auctionId}:${userId}:${amount.toFixed(2)}`,
      });
      const savedHold = await manager.save(WalletHold, hold);
      const referenceId = savedHold.id ?? `${auctionId}:${userId}:${amount.toFixed(2)}`;
      await this.postWalletMovement(
        manager,
        {
          type: 'wallet_hold',
          description: 'Hold wallet funds for auction bid',
          referenceId,
          idempotencyKey: savedHold.idempotencyKey ?? `wallet-hold:${referenceId}`,
        },
        userId,
        amount,
        LedgerAccountType.BUYER_CASH,
        LedgerAccountType.ESCROW,
      );

      wallet.heldAmount = Number(wallet.heldAmount) + amount;
      await manager.save(Wallet, wallet);
      return savedHold;
    });
  }

  async releaseHold(auctionId: string, userId: string): Promise<WalletHold | null> {
    return this.withTransaction(async (manager) => {
      const hold = await manager.findOne(WalletHold, {
        where: { auctionId, userId, status: HoldStatus.HELD },
        lock: { mode: 'pessimistic_write' },
      });
      if (!hold) {
        return null;
      }

      const wallet = await this.getOrCreateLockedWallet(userId, manager);
      await this.postWalletMovement(
        manager,
        {
          type: 'wallet_release',
          description: 'Release auction wallet hold',
          referenceId: hold.id,
          idempotencyKey: `wallet-release:${hold.id}`,
        },
        userId,
        Number(hold.amount),
        LedgerAccountType.ESCROW,
        LedgerAccountType.BUYER_CASH,
      );

      hold.status = HoldStatus.RELEASED;
      await manager.save(WalletHold, hold);
      wallet.heldAmount = Math.max(0, Number(wallet.heldAmount) - Number(hold.amount));
      await manager.save(Wallet, wallet);
      return hold;
    });
  }

  async captureHold(auctionId: string, userId: string): Promise<WalletHold | null> {
    return this.withTransaction(async (manager) => {
      const hold = await manager.findOne(WalletHold, {
        where: { auctionId, userId, status: HoldStatus.HELD },
        lock: { mode: 'pessimistic_write' },
      });
      if (!hold) {
        return null;
      }

      const wallet = await this.getOrCreateLockedWallet(userId, manager);
      await this.postWalletMovement(
        manager,
        {
          type: 'wallet_capture',
          description: 'Capture auction wallet hold',
          referenceId: hold.id,
          idempotencyKey: `wallet-capture:${hold.id}`,
        },
        userId,
        Number(hold.amount),
        LedgerAccountType.ESCROW,
        LedgerAccountType.SELLER_PENDING,
      );

      hold.status = HoldStatus.CAPTURED;
      await manager.save(WalletHold, hold);
      wallet.balance = Number(wallet.balance) - Number(hold.amount);
      wallet.heldAmount = Math.max(0, Number(wallet.heldAmount) - Number(hold.amount));
      await manager.save(Wallet, wallet);
      return hold;
    });
  }

  async getHolds(userId: string) {
    const holds = await this.holdRepo.find({
      where: { userId, status: HoldStatus.HELD },
      order: { createdAt: 'DESC' },
    });
    return { code: RC.HOLDS_FETCHED, message: 'Wallet holds fetched', holds };
  }

  async getTransactionHistory(userId: string, filters: WalletHistoryFilters = {}) {
    return this.ledgerService.getWalletHistory(userId, filters);
  }

  async requestPayout(sellerId: string, dto: RequestPayoutDto) {
    return this.withTransaction(async (manager) => {
      const existing = await manager.findOne(PayoutRequest, {
        where: { sellerId, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        return {
          code: RC.PAYOUT_REQUEST_CREATED,
          message: 'Payout request already exists',
          payoutRequest: existing,
        };
      }

      const wallet = await this.getOrCreateLockedWallet(sellerId, manager);
      const amount = Number(dto.amount);
      const available = Number(wallet.balance) - Number(wallet.heldAmount);

      if (available < amount) {
        throw new BadRequestException({
          code: RC.INSUFFICIENT_BALANCE,
          message: `Insufficient balance. Available: ${available.toFixed(2)}, required: ${amount.toFixed(2)}`,
        });
      }

      const payoutRequest = manager.create(PayoutRequest, {
        sellerId,
        amount,
        currency: dto.currency ?? 'TRY',
        status: PayoutRequestStatus.ADMIN_REVIEW,
        idempotencyKey: dto.idempotencyKey,
        payoutMethodMetadata: {
          ...(dto.payoutMethodMetadata ?? {}),
          platformCommissionRate: this.getPlatformCommissionRate(),
        },
        reviewReason: null,
        manualPayoutReference: null,
        reviewedAt: null,
        approvedAt: null,
        rejectedAt: null,
      });
      const saved = await manager.save(PayoutRequest, payoutRequest);

      await this.postPayoutMovement(
        manager,
        {
          type: 'payout_reserve',
          description: 'Reserve seller funds for payout review',
          referenceId: saved.id,
          idempotencyKey: `payout-reserve:${saved.id}`,
        },
        sellerId,
        amount,
        dto.currency ?? 'TRY',
        LedgerAccountType.SELLER_AVAILABLE,
        LedgerAccountType.PAYOUT_RESERVED,
      );

      wallet.heldAmount = Number(wallet.heldAmount) + amount;
      await manager.save(Wallet, wallet);

      return {
        code: RC.PAYOUT_REQUEST_CREATED,
        message: 'Payout request created',
        payoutRequest: saved,
      };
    });
  }

  async listPayoutRequests(sellerId: string) {
    const payoutRequests = await this.payoutRequestRepo.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });

    return {
      code: RC.PAYOUT_REQUEST_FETCHED,
      message: 'Payout requests fetched',
      payoutRequests,
    };
  }

  async approvePayoutRequest(id: string, dto: ReviewPayoutDto = {}) {
    return this.reviewPayoutRequest(id, PayoutRequestStatus.APPROVED, dto);
  }

  async rejectPayoutRequest(id: string, dto: ReviewPayoutDto = {}) {
    return this.reviewPayoutRequest(id, PayoutRequestStatus.REJECTED, dto);
  }

  async releaseAllHoldsForAuction(auctionId: string, exceptUserId?: string): Promise<void> {
    const holds = await this.holdRepo.find({
      where: { auctionId, status: HoldStatus.HELD },
    });

    for (const hold of holds) {
      if (hold.userId === exceptUserId) continue;
      await this.releaseHold(auctionId, hold.userId);
    }
  }

  private async reviewPayoutRequest(
    id: string,
    targetStatus: PayoutRequestStatus.APPROVED | PayoutRequestStatus.REJECTED,
    dto: ReviewPayoutDto,
  ) {
    return this.withTransaction(async (manager) => {
      const payoutRequest = await manager.findOne(PayoutRequest, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!payoutRequest) {
        throw new BadRequestException({
          code: RC.NOT_FOUND,
          message: 'Payout request not found',
        });
      }

      if (
        ![PayoutRequestStatus.REQUESTED, PayoutRequestStatus.ADMIN_REVIEW].includes(
          payoutRequest.status,
        )
      ) {
        return {
          code: RC.PAYOUT_REQUEST_INVALID_STATUS,
          message: 'Payout request status cannot be changed',
          payoutRequest,
        };
      }

      payoutRequest.reviewReason = dto.reason ?? null;
      payoutRequest.manualPayoutReference = dto.manualPayoutReference ?? null;
      payoutRequest.reviewedAt = new Date();

      if (targetStatus === PayoutRequestStatus.APPROVED) {
        payoutRequest.status = dto.manualPayoutReference
          ? PayoutRequestStatus.PAID
          : PayoutRequestStatus.APPROVED;
        payoutRequest.approvedAt = new Date();
      } else {
        payoutRequest.status = PayoutRequestStatus.REJECTED;
        payoutRequest.rejectedAt = new Date();
        await this.releasePayoutReservation(manager, payoutRequest);
      }

      const saved = await manager.save(PayoutRequest, payoutRequest);
      await this.notificationService?.createFromEvent({
        eventId: `payout:${saved.id}:${saved.status}`,
        userId: saved.sellerId,
        eventType:
          targetStatus === PayoutRequestStatus.APPROVED
            ? NotificationEventType.PAYOUT_REQUEST_APPROVED
            : NotificationEventType.PAYOUT_REQUEST_REJECTED,
        title:
          targetStatus === PayoutRequestStatus.APPROVED
            ? 'Payout request approved'
            : 'Payout request rejected',
        body:
          targetStatus === PayoutRequestStatus.APPROVED
            ? 'Your payout request was approved.'
            : 'Your payout request was rejected.',
        relatedEntityType: 'payoutRequest',
        relatedEntityId: saved.id,
      });

      return {
        code:
          targetStatus === PayoutRequestStatus.APPROVED
            ? RC.PAYOUT_REQUEST_APPROVED
            : RC.PAYOUT_REQUEST_REJECTED,
        message:
          targetStatus === PayoutRequestStatus.APPROVED
            ? 'Payout request approved'
            : 'Payout request rejected',
        payoutRequest: saved,
      };
    });
  }

  private async getOrCreateLockedWallet(userId: string, manager: EntityManager): Promise<Wallet> {
    let wallet = await manager.findOne(Wallet, {
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!wallet) {
      wallet = manager.create(Wallet, { userId, balance: 10000, heldAmount: 0 });
      wallet = await manager.save(Wallet, wallet);
    }
    return wallet;
  }

  private async postWalletMovement(
    manager: EntityManager,
    entry: {
      type: string;
      description: string;
      referenceId: string;
      idempotencyKey: string;
    },
    userId: string,
    amount: number,
    debitType: LedgerAccountType,
    creditType: LedgerAccountType,
  ): Promise<void> {
    const debitAccount = await this.ledgerService.getOrCreateAccount(userId, debitType, 'TRY', manager);
    const creditAccount = await this.ledgerService.getOrCreateAccount(
      creditType === LedgerAccountType.SELLER_PENDING ? null : userId,
      creditType,
      'TRY',
      manager,
    );

    await this.ledgerService.postEntry(
      {
        type: entry.type,
        description: entry.description,
        referenceType: LedgerReferenceType.AUCTION_HOLD,
        referenceId: entry.referenceId,
        idempotencyKey: entry.idempotencyKey,
        lines: [
          {
            accountId: debitAccount.id,
            amount,
            currency: 'TRY',
            direction: LedgerDirection.DEBIT,
            userId,
          },
          {
            accountId: creditAccount.id,
            amount,
            currency: 'TRY',
            direction: LedgerDirection.CREDIT,
            userId,
          },
        ],
      },
      manager,
    );
  }

  private async postPayoutMovement(
    manager: EntityManager,
    entry: {
      type: string;
      description: string;
      referenceId: string;
      idempotencyKey: string;
    },
    sellerId: string,
    amount: number,
    currency: string,
    debitType: LedgerAccountType,
    creditType: LedgerAccountType,
  ): Promise<void> {
    const debitAccount = await this.ledgerService.getOrCreateAccount(
      sellerId,
      debitType,
      currency,
      manager,
    );
    const creditAccount = await this.ledgerService.getOrCreateAccount(
      sellerId,
      creditType,
      currency,
      manager,
    );

    await this.ledgerService.postEntry(
      {
        type: entry.type,
        description: entry.description,
        referenceType: LedgerReferenceType.PAYOUT_REQUEST,
        referenceId: entry.referenceId,
        idempotencyKey: entry.idempotencyKey,
        lines: [
          {
            accountId: debitAccount.id,
            amount,
            currency,
            direction: LedgerDirection.DEBIT,
            userId: sellerId,
          },
          {
            accountId: creditAccount.id,
            amount,
            currency,
            direction: LedgerDirection.CREDIT,
            userId: sellerId,
          },
        ],
      },
      manager,
    );
  }

  private async releasePayoutReservation(
    manager: EntityManager,
    payoutRequest: PayoutRequest,
  ): Promise<void> {
    await this.postPayoutMovement(
      manager,
      {
        type: 'payout_release',
        description: 'Release rejected payout reservation',
        referenceId: payoutRequest.id,
        idempotencyKey: `payout-release:${payoutRequest.id}`,
      },
      payoutRequest.sellerId,
      Number(payoutRequest.amount),
      payoutRequest.currency,
      LedgerAccountType.PAYOUT_RESERVED,
      LedgerAccountType.SELLER_AVAILABLE,
    );

    const wallet = await this.getOrCreateLockedWallet(payoutRequest.sellerId, manager);
    wallet.heldAmount = Math.max(0, Number(wallet.heldAmount) - Number(payoutRequest.amount));
    await manager.save(Wallet, wallet);
  }

  private getPlatformCommissionRate(): number {
    const configuredRate = this.configService?.get<number>('PLATFORM_COMMISSION_RATE');
    return configuredRate ?? 0.1;
  }

  private async withTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await work(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
