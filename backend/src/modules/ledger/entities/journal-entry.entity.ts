import { JournalEntryType, LedgerReferenceType } from '@endemigo/shared/enums';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { JournalLine } from './journal-line.entity';

export enum JournalEntryStatus {
  POSTED = 'POSTED',
}

@Entity('journal_entries')
@Index(['referenceType', 'referenceId'])
@Index(['idempotencyKey'], { unique: true })
export class JournalEntry extends BaseEntity {
  @Column({ type: 'enum', enum: JournalEntryType, enumName: 'journal_entry_type' })
  type: JournalEntryType;

  @Column({
    type: 'enum',
    enum: JournalEntryStatus,
    enumName: 'journal_entry_status',
    default: JournalEntryStatus.POSTED,
  })
  status: JournalEntryStatus;

  @Column({ type: 'enum', enum: LedgerReferenceType })
  referenceType: LedgerReferenceType;

  @Column()
  referenceId: string;

  @Column({ unique: true })
  idempotencyKey: string;

  @Column()
  description: string;

  @OneToMany(() => JournalLine, (line) => line.entry)
  lines: JournalLine[];
}
