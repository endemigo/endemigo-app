import { PaymentProvider } from '@endemigo/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Payment } from './payment.entity';

@Entity('payment_provider_events')
@Index(['eventKey'], { unique: true })
export class PaymentProviderEvent extends BaseEntity {
  @Column({ type: 'enum', enum: PaymentProvider, default: PaymentProvider.IYZICO })
  provider: PaymentProvider;

  @Column({ unique: true })
  eventKey: string;

  @Column({ type: 'uuid', nullable: true })
  paymentId: string | null;

  @ManyToOne(() => Payment, { nullable: true })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment | null;

  @Column({ type: 'varchar', nullable: true })
  providerPaymentId: string | null;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;
}
