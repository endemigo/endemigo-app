import { PayoutRequestStatus } from '@endemigo/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

@Entity('payout_requests')
@Index(['sellerId', 'idempotencyKey'], { unique: true })
export class PayoutRequest extends BaseEntity {
  @Column()
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'TRY' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PayoutRequestStatus,
    default: PayoutRequestStatus.REQUESTED,
  })
  status: PayoutRequestStatus;

  @Column()
  idempotencyKey: string;

  @Column({ type: 'jsonb', default: {} })
  payoutMethodMetadata: Record<string, unknown>;

  @Column({ type: 'varchar', nullable: true })
  reviewReason: string | null;

  @Column({ type: 'varchar', nullable: true })
  manualPayoutReference: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  rejectedAt: Date | null;
}
