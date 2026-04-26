import { EscrowStatus, OrderSource, OrderStatus } from '@endemigo/shared';
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

  @Column({ nullable: true })
  paymentId: string | null;

  @Column({ nullable: true })
  autoConfirmAt: Date | null;

  @Column({ nullable: true })
  deliveryConfirmedAt: Date | null;

  @Column({ nullable: true })
  completedAt: Date | null;
}
