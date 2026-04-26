import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LedgerAccountType, LedgerDirection, LedgerReferenceType } from '@endemigo/shared/enums';
import { RC } from '@endemigo/shared';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { HoldStatus } from '../../shared/types/hold-status.enum';
import { LedgerService } from '../ledger/ledger.service';
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
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
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

  async releaseAllHoldsForAuction(auctionId: string, exceptUserId?: string): Promise<void> {
    const holds = await this.holdRepo.find({
      where: { auctionId, status: HoldStatus.HELD },
    });

    for (const hold of holds) {
      if (hold.userId === exceptUserId) continue;
      await this.releaseHold(auctionId, hold.userId);
    }
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
