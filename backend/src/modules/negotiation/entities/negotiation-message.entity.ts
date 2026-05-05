import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { NegotiationMessageType } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { Conversation } from './conversation.entity';

@Entity('negotiation_messages')
@Index(['conversationId', 'createdAt'])
export class NegotiationMessage extends BaseEntity {
  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column({ nullable: true })
  senderId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'senderId' })
  sender: User | null;

  @Column({
    type: 'enum',
    enum: NegotiationMessageType,
    enumName: 'negotiation_message_type',
  })
  type: NegotiationMessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'uuid', nullable: true })
  offerId: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;
}
