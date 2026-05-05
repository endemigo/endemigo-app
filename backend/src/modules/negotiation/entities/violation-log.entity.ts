import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ViolationType } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { Conversation } from './conversation.entity';

@Entity('negotiation_violation_logs')
@Index(['conversationId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class ViolationLog extends BaseEntity {
  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  attemptedContent: string;

  @Column({
    type: 'enum',
    enum: ViolationType,
    enumName: 'violation_type',
    array: true,
    default: [],
  })
  violationTypes: ViolationType[];

  @Column({ type: 'text', array: true, default: [] })
  detectedPatterns: string[];

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  deviceId: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;
}
