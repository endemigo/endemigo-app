import { EscrowStatus, OrderReturnReasonCode, OrderSource, OrderStatus } from '@endemigo/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

@Entity('orders')
@Index(['source', 'sourceReferenceId'], { unique: true })
export class Order extends BaseEntity {
  @Column()
  buyerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column()
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column()
  productId: string;

  @Column({ type: 'enum', enum: OrderSource })
  source: OrderSource;

  @Column()
  sourceReferenceId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'TRY' })
  currency: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.CREATED })
  status: OrderStatus;

  @Column({ type: 'enum', enum: EscrowStatus, default: EscrowStatus.NOT_FUNDED })
  escrowStatus: EscrowStatus;

  @Column({ type: 'uuid', nullable: true })
  paymentId: string | null;

  @Column({ type: 'varchar', nullable: true })
  groupId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  autoConfirmAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deliveryConfirmedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({
    type: 'enum',
    enum: OrderReturnReasonCode,
    nullable: true,
  })
  returnReasonCode: OrderReturnReasonCode | null;

  @Column({ type: 'text', nullable: true })
  returnReasonNote: string | null;

  @Column({ type: 'uuid', nullable: true })
  returnShipmentId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  returnRequestedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  returnApprovedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  returnDeliveredAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  refundedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  returnImages: string[] | null;
}
