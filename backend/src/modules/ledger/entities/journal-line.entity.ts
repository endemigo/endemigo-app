import { LedgerDirection } from '@endemigo/shared/enums';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { decimalNumberTransformer } from '../../../shared/transformers/decimal-number.transformer';
import { User } from '../../user/entities/user.entity';
import { JournalEntry } from './journal-entry.entity';
import { LedgerAccount } from './ledger-account.entity';

@Entity('journal_lines')
@Index(['userId', 'createdAt'])
export class JournalLine extends BaseEntity {
  @Column()
  entryId: string;

  @ManyToOne(() => JournalEntry, (entry) => entry.lines)
  @JoinColumn({ name: 'entryId' })
  entry: JournalEntry;

  @Column()
  accountId: string;

  @ManyToOne(() => LedgerAccount)
  @JoinColumn({ name: 'accountId' })
  account: LedgerAccount;

  // Platform (sistem) komisyon satırlarında kullanıcı yoktur → nullable.
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'enum', enum: LedgerDirection })
  direction: LedgerDirection;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalNumberTransformer,
  })
  amount: number;

  @Column({ length: 3, default: 'TRY' })
  currency: string;
}
