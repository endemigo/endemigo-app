import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { NegotiationStatus } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from '../../product/entities/product.entity';
import { User } from '../../user/entities/user.entity';
import { Offer } from './offer.entity';
import { NegotiationMessage } from './negotiation-message.entity';

@Entity('negotiation_conversations')
@Index(['productId', 'buyerId', 'sellerId'])
@Index(['buyerId', 'status'])
@Index(['sellerId', 'status'])
export class Conversation extends BaseEntity {
  @Column()
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

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

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({
    type: 'enum',
    enum: NegotiationStatus,
    enumName: 'negotiation_status',
    default: NegotiationStatus.OPEN,
  })
  status: NegotiationStatus;

  @Column({ type: 'uuid', nullable: true })
  acceptedOfferId: string | null;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paymentHoldExpiresAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastActivityAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @OneToMany(() => Offer, (offer) => offer.conversation)
  offers: Offer[];

  @OneToMany(() => NegotiationMessage, (message) => message.conversation)
  messages: NegotiationMessage[];
}
