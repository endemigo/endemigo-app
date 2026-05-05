import { BadRequestException } from '@nestjs/common';
import { RC } from '@endemigo/shared';
import {
  JournalEntryType,
  LedgerDirection,
  LedgerReferenceType,
} from '@endemigo/shared/enums';
import type { DataSource, Repository } from 'typeorm';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerService } from './ledger.service';

type SavedEntity = Record<string, unknown>;

const createService = () => {
  const saved: SavedEntity[] = [];
  const accounts = new Map<string, LedgerAccount>(
    [
      { id: 'wallet-cash', postedBalance: 1000 },
      { id: 'wallet-held', postedBalance: 100 },
    ].map((account) => [account.id, account as LedgerAccount]),
  );
  const manager = {
    findOne: jest.fn(
      (_entity: unknown, options?: { where?: { id?: string } }) =>
        Promise.resolve(
          options?.where?.id ? accounts.get(options.where.id) : null,
        ),
    ),
    create: jest.fn((_entity: unknown, data: SavedEntity) => data),
    save: jest.fn((entity: unknown, data: SavedEntity | SavedEntity[]) => {
      if (entity === LedgerAccount) {
        return Promise.resolve(data);
      }
      if (Array.isArray(data)) {
        saved.push(...data);
        return Promise.resolve(data);
      }
      const savedEntity = { id: `${saved.length + 1}`, ...data };
      saved.push(savedEntity);
      return Promise.resolve(savedEntity);
    }),
  };
  const queryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager,
  };
  const dataSource = {
    createQueryRunner: jest.fn(() => queryRunner),
  } as unknown as DataSource;
  const journalEntryRepo = {
    findOne: jest.fn(),
  };
  const journalLineRepo = {
    createQueryBuilder: jest.fn(),
  };
  const accountRepo = {};

  const service = new LedgerService(
    dataSource,
    accountRepo as unknown as Repository<LedgerAccount>,
    journalEntryRepo as unknown as Repository<JournalEntry>,
    journalLineRepo as unknown as Repository<JournalLine>,
  );

  return {
    service,
    dataSource,
    queryRunner,
    manager,
    journalEntryRepo,
    journalLineRepo,
    saved,
    accounts,
  };
};

describe('LedgerService', () => {
  it('rejects unbalanced journal entries with LEDGER_UNBALANCED', () => {
    const { service } = createService();

    expect(() =>
      service.assertBalanced([
        { direction: LedgerDirection.DEBIT, amount: 100 },
        { direction: LedgerDirection.CREDIT, amount: 90 },
      ]),
    ).toThrow(BadRequestException);

    try {
      service.assertBalanced([
        { direction: LedgerDirection.DEBIT, amount: 100 },
        { direction: LedgerDirection.CREDIT, amount: 90 },
      ]);
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toEqual(
        expect.objectContaining({ code: RC.LEDGER_UNBALANCED }),
      );
    }
  });

  it('writes journal entry and lines in one TypeORM transaction', async () => {
    const { service, queryRunner, manager, saved } = createService();

    const result = await service.postEntry({
      type: JournalEntryType.WALLET_HOLD,
      description: 'Hold funds',
      referenceType: LedgerReferenceType.AUCTION_HOLD,
      referenceId: 'hold-1',
      idempotencyKey: 'wallet-hold:hold-1',
      lines: [
        {
          accountId: 'wallet-cash',
          amount: 250,
          currency: 'TRY',
          direction: LedgerDirection.DEBIT,
          userId: 'user-1',
        },
        {
          accountId: 'wallet-held',
          amount: 250,
          currency: 'TRY',
          direction: LedgerDirection.CREDIT,
          userId: 'user-1',
        },
      ],
    });

    expect(queryRunner.connect).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
    expect(saved).toHaveLength(3);
    expect(manager.findOne).toHaveBeenCalledWith(LedgerAccount, {
      where: { id: 'wallet-cash' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(manager.findOne).toHaveBeenCalledWith(LedgerAccount, {
      where: { id: 'wallet-held' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(result.code).toBe(RC.LEDGER_ENTRY_POSTED);
    expect(result.entry).toEqual(
      expect.objectContaining({ idempotencyKey: 'wallet-hold:hold-1' }),
    );
  });

  it('updates posted balances for debit and credit lines', async () => {
    const { service, accounts } = createService();

    await service.postEntry({
      type: JournalEntryType.WALLET_HOLD,
      description: 'Hold funds',
      referenceType: LedgerReferenceType.AUCTION_HOLD,
      referenceId: 'hold-1',
      idempotencyKey: 'wallet-hold:hold-1',
      lines: [
        {
          accountId: 'wallet-cash',
          amount: 250,
          currency: 'TRY',
          direction: LedgerDirection.DEBIT,
          userId: 'user-1',
        },
        {
          accountId: 'wallet-held',
          amount: 250,
          currency: 'TRY',
          direction: LedgerDirection.CREDIT,
          userId: 'user-1',
        },
      ],
    });

    expect(accounts.get('wallet-cash')?.postedBalance).toBe(1250);
    expect(accounts.get('wallet-held')?.postedBalance).toBe(-150);
  });

  it('returns existing journal entry for duplicate idempotency key', async () => {
    const { service, journalEntryRepo, queryRunner } = createService();
    journalEntryRepo.findOne.mockResolvedValue({
      id: 'entry-1',
      idempotencyKey: 'wallet-hold:hold-1',
    });

    const result = await service.postEntry({
      type: JournalEntryType.WALLET_HOLD,
      description: 'Hold funds',
      referenceType: LedgerReferenceType.AUCTION_HOLD,
      referenceId: 'hold-1',
      idempotencyKey: 'wallet-hold:hold-1',
      lines: [
        {
          accountId: 'wallet-cash',
          amount: 250,
          currency: 'TRY',
          direction: LedgerDirection.DEBIT,
          userId: 'user-1',
        },
        {
          accountId: 'wallet-held',
          amount: 250,
          currency: 'TRY',
          direction: LedgerDirection.CREDIT,
          userId: 'user-1',
        },
      ],
    });

    expect(queryRunner.startTransaction).not.toHaveBeenCalled();
    expect(result.entry).toEqual(expect.objectContaining({ id: 'entry-1' }));
  });

  it('returns wallet history with UI-safe fields', async () => {
    const { service, journalLineRepo } = createService();
    const getMany = jest.fn().mockResolvedValue([
      {
        id: 'line-1',
        amount: 75,
        currency: 'TRY',
        direction: LedgerDirection.DEBIT,
        entry: {
          type: JournalEntryType.WALLET_RELEASE,
          status: 'POSTED',
          description: 'Release hold',
          referenceType: LedgerReferenceType.AUCTION_HOLD,
          referenceId: 'hold-1',
          createdAt: new Date('2026-04-26T10:00:00.000Z'),
        },
      },
    ]);
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany,
      getManyAndCount: jest.fn(async () => {
        const lines = (await getMany()) as unknown[];
        return [lines, 1] as const;
      }),
    };
    journalLineRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getWalletHistory('user-1', { limit: 20 });

    expect(result.code).toBe(RC.WALLET_HISTORY_FETCHED);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.hasNextPage).toBe(false);
    expect(result.items).toEqual([
      {
        id: 'line-1',
        amount: 75,
        currency: 'TRY',
        direction: LedgerDirection.DEBIT,
        type: JournalEntryType.WALLET_RELEASE,
        status: 'POSTED',
        description: 'Release hold',
        relatedEntityType: LedgerReferenceType.AUCTION_HOLD,
        relatedEntityId: 'hold-1',
        createdAt: new Date('2026-04-26T10:00:00.000Z'),
      },
    ]);
  });

  it('applies grouped wallet history type filters with server-side pagination', async () => {
    const { service, journalLineRepo } = createService();
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(() => Promise.resolve([[], 42] as const)),
    };
    journalLineRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getWalletHistory('user-1', {
      limit: 20,
      page: 2,
      types: ['payment', 'payment_escrow'],
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'entry.type IN (:...types)',
      {
        types: ['payment', 'payment_escrow'],
      },
    );
    expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    expect(queryBuilder.take).toHaveBeenCalledWith(20);
    expect(result.total).toBe(42);
    expect(result.hasNextPage).toBe(true);
  });
});
