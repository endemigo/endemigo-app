import { PaymentProvider, PaymentStatus } from '@endemigo/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

@Entity('payments')
@Index(['idempotencyKey'], { unique: true })
export class Payment extends BaseEntity {
  @Column()
  buyerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'TRY' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentProvider, default: PaymentProvider.IYZICO })
  provider: PaymentProvider;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ unique: true })
  idempotencyKey: string;

  @Column({ type: 'varchar', nullable: true })
  checkoutToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  checkoutUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  providerPaymentId: string | null;

  @Column({ type: 'varchar', nullable: true })
  refundProviderId: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  refundedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  adminReviewAt: Date | null;
}
