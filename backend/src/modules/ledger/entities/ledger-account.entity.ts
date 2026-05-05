import { LedgerAccountType } from '@endemigo/shared/enums';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { decimalNumberTransformer } from '../../../shared/transformers/decimal-number.transformer';
import { User } from '../../user/entities/user.entity';

@Entity('ledger_accounts')
@Index(
  'uq_ledger_accounts_user_owner_type_currency',
  ['ownerId', 'type', 'currency'],
  {
    unique: true,
    where: '"ownerId" IS NOT NULL',
  },
)
@Index('uq_ledger_accounts_platform_type_currency', ['type', 'currency'], {
  unique: true,
  where: '"ownerId" IS NULL',
})
export class LedgerAccount extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  ownerId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User | null;

  @Column({ type: 'enum', enum: LedgerAccountType })
  type: LedgerAccountType;

  @Column({ length: 3, default: 'TRY' })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalNumberTransformer,
  })
  postedBalance: number;

  @Column({ default: true })
  isActive: boolean;
}
