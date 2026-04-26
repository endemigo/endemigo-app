import { OrderStatus } from '@endemigo/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from './order.entity';

@Entity('order_audit_events')
@Index(['orderId', 'createdAt'])
export class OrderAuditEvent extends BaseEntity {
  @Column()
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'enum', enum: OrderStatus, nullable: true })
  fromStatus: OrderStatus | null;

  @Column({ type: 'enum', enum: OrderStatus })
  toStatus: OrderStatus;

  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;
}
