import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { OfferStatus } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { Conversation } from './conversation.entity';

@Entity('negotiation_offers')
@Index(['conversationId', 'status'])
@Index(['expiresAt'])
export class Offer extends BaseEntity {
  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.offers)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({
    type: 'enum',
    enum: OfferStatus,
    enumName: 'offer_status',
    default: OfferStatus.PENDING,
  })
  status: OfferStatus;

  @Column({ type: 'int' })
  expiryHours: number;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'uuid', nullable: true })
  parentOfferId: string | null;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
