import { LedgerAccountType } from '@endemigo/shared/enums';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

@Entity('ledger_accounts')
@Index(['ownerId', 'type', 'currency'], { unique: true })
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

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  postedBalance: number;

  @Column({ default: true })
  isActive: boolean;
}
