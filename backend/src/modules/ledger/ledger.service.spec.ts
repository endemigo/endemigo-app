import { BadRequestException } from '@nestjs/common';
import { RC } from '@endemigo/shared';
import { LedgerDirection, LedgerReferenceType } from '@endemigo/shared/enums';
import { LedgerService } from './ledger.service';

type SavedEntity = Record<string, unknown>;

const createService = () => {
  const saved: SavedEntity[] = [];
  const manager = {
    findOne: jest.fn(),
    create: jest.fn((_entity: unknown, data: SavedEntity) => data),
    save: jest.fn(async (_entity: unknown, data: SavedEntity | SavedEntity[]) => {
      if (Array.isArray(data)) {
        saved.push(...data);
        return data;
      }
      const entity = { id: `${saved.length + 1}`, ...data };
      saved.push(entity);
      return entity;
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
  };
  const journalEntryRepo = {
    findOne: jest.fn(),
  };
  const journalLineRepo = {
    createQueryBuilder: jest.fn(),
  };
  const accountRepo = {};

  const service = new LedgerService(
    dataSource,
    accountRepo,
    journalEntryRepo,
    journalLineRepo,
  );

  return { service, dataSource, queryRunner, manager, journalEntryRepo, journalLineRepo, saved };
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
    const { service, queryRunner, saved } = createService();

    const result = await service.postEntry({
      type: 'wallet_hold',
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
    expect(result.code).toBe(RC.LEDGER_ENTRY_POSTED);
    expect(result.entry).toEqual(expect.objectContaining({ idempotencyKey: 'wallet-hold:hold-1' }));
  });

  it('returns existing journal entry for duplicate idempotency key', async () => {
    const { service, journalEntryRepo, queryRunner } = createService();
    journalEntryRepo.findOne.mockResolvedValue({
      id: 'entry-1',
      idempotencyKey: 'wallet-hold:hold-1',
    });

    const result = await service.postEntry({
      type: 'wallet_hold',
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
          type: 'wallet_release',
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
      take: jest.fn().mockReturnThis(),
      getMany,
    };
    journalLineRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getWalletHistory('user-1', { limit: 20 });

    expect(result.code).toBe(RC.WALLET_HISTORY_FETCHED);
    expect(result.items).toEqual([
      {
        id: 'line-1',
        amount: 75,
        currency: 'TRY',
        direction: LedgerDirection.DEBIT,
        type: 'wallet_release',
        status: 'POSTED',
        description: 'Release hold',
        relatedEntityType: LedgerReferenceType.AUCTION_HOLD,
        relatedEntityId: 'hold-1',
        createdAt: new Date('2026-04-26T10:00:00.000Z'),
      },
    ]);
  });
});
