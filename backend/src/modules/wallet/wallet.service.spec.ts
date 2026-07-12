import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { LedgerAccountType, LedgerReferenceType } from '@endemigo/shared/enums';
import { RC } from '@endemigo/shared';
import { PayoutRequestStatus } from '@endemigo/shared';
import { DataSource } from 'typeorm';
import { LedgerService } from '../ledger/ledger.service';
import { MembershipService } from '../membership/membership.service';
import { TrustService } from '../trust/trust.service';
import { PayoutRequest } from './entities/payout-request.entity';
import { WalletHold } from './entities/wallet-hold.entity';
import { Wallet } from './entities/wallet.entity';
import { WalletService } from './wallet.service';

type MockRepository<T> = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock<T, [Partial<T>]>;
  save: jest.Mock<Promise<T>, [T]>;
};

const createRepository = <T extends { id?: string }>(
  idPrefix: string,
): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  create: jest.fn(
    (data: Partial<T>) => ({ id: `${idPrefix}-new`, ...data }) as T,
  ),
  save: jest.fn(async (entity: T) => entity),
});

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: MockRepository<Wallet>;
  let holdRepo: MockRepository<WalletHold>;
  let payoutRequestRepo: MockRepository<PayoutRequest>;
  let ledgerService: {
    getOrCreateAccount: jest.Mock;
    postEntry: jest.Mock;
    getWalletHistory: jest.Mock;
  };
  let membershipService: {
    getSellerBenefits: jest.Mock;
  };
  let trustService: {
    assertAllowed: jest.Mock;
  };
  let manager: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: typeof manager;
  };

  const wallet = {
    id: 'wallet-1',
    userId: 'user-1',
    balance: 10000,
    heldAmount: 0,
  } as Wallet;

  beforeEach(async () => {
    walletRepo = createRepository<Wallet>('wallet');
    holdRepo = createRepository<WalletHold>('hold');
    payoutRequestRepo = createRepository<PayoutRequest>('payout');
    manager = {
      findOne: jest.fn(),
      create: jest.fn((_entity: unknown, data: unknown) => data),
      save: jest.fn(async (_entityOrData: unknown, data?: unknown) => {
        const entity = data ?? _entityOrData;
        if (entity && typeof entity === 'object' && !('id' in entity)) {
          return { id: 'saved-1', ...entity };
        }
        return entity;
      }),
      find: jest.fn().mockResolvedValue([]),
    };
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager,
    };
    const dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
    };
    ledgerService = {
      getOrCreateAccount: jest.fn(
        async (ownerId: string | null, type: LedgerAccountType) => ({
          id: `${ownerId ?? 'platform'}:${type}`,
        }),
      ),
      postEntry: jest.fn(async () => ({
        code: RC.LEDGER_ENTRY_POSTED,
        message: 'Ledger entry posted',
      })),
      getWalletHistory: jest.fn(async () => ({
        code: RC.WALLET_HISTORY_FETCHED,
        message: 'Wallet history fetched',
        items: [],
      })),
    };
    membershipService = {
      getSellerBenefits: jest.fn().mockResolvedValue({
        visibilityBoost: 0,
        adCredits: 0,
        adDiscountRate: 0,
        commissionRate: 0.1,
        payoutPriority: 'standard',
        badgeLevel: 'New',
      }),
    };
    trustService = {
      assertAllowed: jest.fn().mockResolvedValue({ allowed: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: getRepositoryToken(Wallet), useValue: walletRepo },
        { provide: getRepositoryToken(WalletHold), useValue: holdRepo },
        {
          provide: getRepositoryToken(PayoutRequest),
          useValue: payoutRequestRepo,
        },
        { provide: DataSource, useValue: dataSource },
        { provide: LedgerService, useValue: ledgerService },
        { provide: MembershipService, useValue: membershipService },
        { provide: TrustService, useValue: trustService },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  it('creates new wallets with zero default balance', async () => {
    walletRepo.findOne.mockResolvedValueOnce(null);

    await service.getOrCreateWallet('user-new');

    expect(walletRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-new',
        balance: 0,
        heldAmount: 0,
      }),
    );
  });

  it('returns balance, held, and available summary fields', async () => {
    walletRepo.findOne.mockResolvedValue({ ...wallet, heldAmount: 3000 });

    const result = await service.getBalance('user-1');

    expect(result).toEqual(
      expect.objectContaining({
        code: RC.BALANCE_FETCHED,
        balance: 10000,
        held: 3000,
        available: 7000,
      }),
    );
  });

  it('creates holds through a pessimistic wallet lock and ledger entry', async () => {
    manager.findOne
      .mockResolvedValueOnce({ ...wallet })
      .mockResolvedValueOnce(null);

    const result = await service.createHold('auction-1', 'user-1', 5000);

    expect(manager.findOne).toHaveBeenCalledWith(
      Wallet,
      expect.objectContaining({
        where: { userId: 'user-1' },
        lock: { mode: 'pessimistic_write' },
      }),
    );
    expect(ledgerService.postEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceType: LedgerReferenceType.AUCTION_HOLD,
        referenceId: expect.any(String),
        idempotencyKey: expect.stringContaining('wallet-hold:'),
      }),
      manager,
    );
    expect(result.status).toBe('HELD');
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('forces payout manual review when trust restrictions override priority benefits', async () => {
    membershipService.getSellerBenefits.mockResolvedValueOnce({
      visibilityBoost: 0,
      adCredits: 0,
      adDiscountRate: 0,
      commissionRate: 0.08,
      payoutPriority: 'priority',
      badgeLevel: 'Trusted',
    });
    trustService.assertAllowed.mockRejectedValueOnce(
      new Error('manual review'),
    );
    manager.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...wallet });

    const result = await service.requestPayout('user-1', {
      amount: 2500,
      currency: 'TRY',
      idempotencyKey: 'payout:user-1:restricted',
      payoutMethodMetadata: { ibanLast4: '1234' },
    });

    expect(result.payoutRequest.status).toBe(PayoutRequestStatus.ADMIN_REVIEW);
    expect(result.payoutRequest.payoutMethodMetadata).toEqual(
      expect.objectContaining({
        payoutPriority: 'manual review',
        manualReviewForced: true,
        manualReviewReason: 'PAYOUT_MANUAL_REVIEW',
      }),
    );
  });

  it('rejects holds that exceed available cached balance', async () => {
    manager.findOne.mockResolvedValue({ ...wallet, heldAmount: 9500 });

    await expect(
      service.createHold('auction-1', 'user-1', 1000),
    ).rejects.toThrow(BadRequestException);
    expect(ledgerService.postEntry).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('releases held funds through ledger and decreases held summary', async () => {
    manager.findOne
      .mockResolvedValueOnce({
        id: 'hold-1',
        walletId: 'wallet-1',
        auctionId: 'auction-1',
        userId: 'user-1',
        amount: 3000,
        status: 'HELD',
      })
      .mockResolvedValueOnce({ ...wallet, heldAmount: 3000 });

    const result = await service.releaseHold('auction-1', 'user-1');

    expect(ledgerService.postEntry).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'wallet_release' }),
      manager,
    );
    expect(result?.status).toBe('RELEASED');
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('releases auction holds in a single transaction scope', async () => {
    manager.find.mockResolvedValueOnce([
      { userId: 'user-1' } as WalletHold,
      { userId: 'user-2' } as WalletHold,
    ]);
    const releaseHoldSpy = jest
      .spyOn(service, 'releaseHold')
      .mockResolvedValue(null);

    await service.releaseAllHoldsForAuction('auction-1', 'user-2');

    expect(releaseHoldSpy).toHaveBeenCalledTimes(1);
    expect(releaseHoldSpy).toHaveBeenCalledWith('auction-1', 'user-1', manager);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('captures held funds through ledger and decreases balance plus held summary', async () => {
    manager.findOne
      .mockResolvedValueOnce({
        id: 'hold-1',
        walletId: 'wallet-1',
        auctionId: 'auction-1',
        userId: 'user-1',
        amount: 5000,
        status: 'HELD',
      })
      .mockResolvedValueOnce({ ...wallet, balance: 10000, heldAmount: 5000 });

    const result = await service.captureHold('auction-1', 'user-1');

    expect(ledgerService.postEntry).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'wallet_capture' }),
      manager,
    );
    expect(result?.status).toBe('CAPTURED');
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('delegates transaction history to LedgerService', async () => {
    const result = await service.getTransactionHistory('user-1', { limit: 10 });

    expect(ledgerService.getWalletHistory).toHaveBeenCalledWith('user-1', {
      limit: 10,
    });
    expect(result.code).toBe(RC.WALLET_HISTORY_FETCHED);
  });

  it('creates a durable payout request and reserves seller funds through ledger', async () => {
    manager.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...wallet });

    const result = await service.requestPayout('user-1', {
      amount: 2500,
      currency: 'TRY',
      idempotencyKey: 'payout:user-1:1',
      payoutMethodMetadata: { ibanLast4: '1234' },
    });

    expect(result.code).toBe(RC.PAYOUT_REQUEST_CREATED);
    expect(result.payoutRequest.status).toBe(PayoutRequestStatus.ADMIN_REVIEW);
    expect(ledgerService.postEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceType: LedgerReferenceType.PAYOUT_REQUEST,
        idempotencyKey: expect.stringContaining('payout-reserve:'),
      }),
      manager,
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('returns the existing payout request for duplicate seller idempotency key', async () => {
    manager.findOne.mockResolvedValueOnce({
      id: 'payout-1',
      sellerId: 'user-1',
      idempotencyKey: 'payout:user-1:1',
      status: PayoutRequestStatus.ADMIN_REVIEW,
    });

    const result = await service.requestPayout('user-1', {
      amount: 2500,
      idempotencyKey: 'payout:user-1:1',
    });

    expect(result.code).toBe(RC.PAYOUT_REQUEST_CREATED);
    expect(ledgerService.postEntry).not.toHaveBeenCalled();
  });

  it('approves payout requests without marking bank payout paid unless reference exists', async () => {
    manager.findOne.mockResolvedValueOnce({
      id: 'payout-1',
      sellerId: 'user-1',
      amount: 2500,
      currency: 'TRY',
      status: PayoutRequestStatus.ADMIN_REVIEW,
    });

    const result = await service.approvePayoutRequest('payout-1', {
      reason: 'Manual review complete',
    });

    expect(result.code).toBe(RC.PAYOUT_REQUEST_APPROVED);
    expect(result.payoutRequest.status).toBe(PayoutRequestStatus.APPROVED);
  });

  it('rejects payout requests and releases reserved funds', async () => {
    manager.findOne
      .mockResolvedValueOnce({
        id: 'payout-1',
        sellerId: 'user-1',
        amount: 2500,
        currency: 'TRY',
        status: PayoutRequestStatus.ADMIN_REVIEW,
      })
      .mockResolvedValueOnce({ ...wallet, heldAmount: 2500 });

    const result = await service.rejectPayoutRequest('payout-1', {
      reason: 'Invalid payout details',
    });

    expect(result.code).toBe(RC.PAYOUT_REQUEST_REJECTED);
    expect(result.payoutRequest.status).toBe(PayoutRequestStatus.REJECTED);
    expect(ledgerService.postEntry).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'payout_release' }),
      manager,
    );
  });
});
