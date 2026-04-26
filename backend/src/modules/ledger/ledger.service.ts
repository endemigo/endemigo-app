import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LedgerDirection, LedgerReferenceType } from '@endemigo/shared/enums';
import { RC } from '@endemigo/shared';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { JournalEntry, JournalEntryStatus } from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';
import { LedgerAccount } from './entities/ledger-account.entity';

export interface LedgerLineInput {
  accountId: string;
  amount: number;
  currency: string;
  direction: LedgerDirection;
  userId: string;
}

export interface PostLedgerEntryInput {
  type: string;
  description: string;
  referenceType: LedgerReferenceType;
  referenceId: string;
  idempotencyKey: string;
  lines: LedgerLineInput[];
}

export interface LedgerHistoryFilters {
  limit?: number;
  type?: string;
}

@Injectable()
export class LedgerService {
  constructor(
    private readonly dataSource?: DataSource,
    @InjectRepository(LedgerAccount)
    private readonly accountRepo?: Repository<LedgerAccount>,
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepo?: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private readonly journalLineRepo?: Repository<JournalLine>,
  ) {}

  assertBalanced(lines: Array<{ direction: LedgerDirection | string; amount: number }>): void {
    const totals = lines.reduce(
      (acc, line) => {
        const amount = Number(line.amount);
        if (line.direction === LedgerDirection.DEBIT) {
          acc.debits += amount;
        }
        if (line.direction === LedgerDirection.CREDIT) {
          acc.credits += amount;
        }
        return acc;
      },
      { debits: 0, credits: 0 },
    );

    if (Math.round(totals.debits * 100) !== Math.round(totals.credits * 100)) {
      throw new BadRequestException({
        code: RC.LEDGER_UNBALANCED,
        message: 'Ledger entry debit and credit totals must match',
      });
    }
  }

  async postEntry(input: PostLedgerEntryInput, manager?: EntityManager) {
    this.assertBalanced(input.lines);

    const existing = await this.journalEntryRepo?.findOne({
      where: { idempotencyKey: input.idempotencyKey },
      relations: { lines: true },
    });
    if (existing) {
      return {
        code: RC.LEDGER_ENTRY_POSTED,
        message: 'Ledger entry already posted',
        entry: existing,
      };
    }

    if (manager) {
      const entry = await this.saveEntry(input, manager);
      return { code: RC.LEDGER_ENTRY_POSTED, message: 'Ledger entry posted', entry };
    }

    if (!this.dataSource) {
      throw new BadRequestException({
        code: RC.INTERNAL_ERROR,
        message: 'Ledger data source is not configured',
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const entry = await this.saveEntry(input, queryRunner.manager);
      await queryRunner.commitTransaction();
      return { code: RC.LEDGER_ENTRY_POSTED, message: 'Ledger entry posted', entry };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getWalletHistory(userId: string, filters: LedgerHistoryFilters = {}) {
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
    const query = this.journalLineRepo
      ?.createQueryBuilder('line')
      .leftJoinAndSelect('line.entry', 'entry')
      .where('line.userId = :userId', { userId })
      .orderBy('line.createdAt', 'DESC')
      .take(limit);

    if (!query) {
      return { code: RC.WALLET_HISTORY_FETCHED, message: 'Wallet history fetched', items: [] };
    }

    if (filters.type) {
      query.andWhere('entry.type = :type', { type: filters.type });
    }

    const lines = await query.getMany();
    return {
      code: RC.WALLET_HISTORY_FETCHED,
      message: 'Wallet history fetched',
      items: lines.map((line) => ({
        id: line.id,
        amount: Number(line.amount),
        currency: line.currency,
        direction: line.direction,
        type: line.entry.type,
        status: line.entry.status,
        description: line.entry.description,
        relatedEntityType: line.entry.referenceType,
        relatedEntityId: line.entry.referenceId,
        createdAt: line.entry.createdAt,
      })),
    };
  }

  private async saveEntry(input: PostLedgerEntryInput, manager: EntityManager): Promise<JournalEntry> {
    const entry = manager.create(JournalEntry, {
      type: input.type,
      status: JournalEntryStatus.POSTED,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      idempotencyKey: input.idempotencyKey,
      description: input.description,
    });
    const savedEntry = await manager.save(JournalEntry, entry);
    const lines = input.lines.map((line) =>
      manager.create(JournalLine, {
        ...line,
        entryId: savedEntry.id,
      }),
    );
    await manager.save(JournalLine, lines);
    return savedEntry;
  }
}
