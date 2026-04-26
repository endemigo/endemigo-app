import {
  NotificationDeliveryStatus,
  NotificationEventType,
} from '@endemigo/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

@Entity('notifications')
@Index(['userId', 'eventId'], { unique: true })
export class Notification extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  eventId: string;

  @Column({ type: 'enum', enum: NotificationEventType })
  eventType: NotificationEventType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', nullable: true })
  relatedEntityType: string | null;

  @Column({ type: 'varchar', nullable: true })
  relatedEntityId: string | null;

  @Column({
    type: 'enum',
    enum: NotificationDeliveryStatus,
    default: NotificationDeliveryStatus.PENDING,
  })
  deliveryStatus: NotificationDeliveryStatus;

  @Column({ type: 'varchar', nullable: true })
  providerMessageId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;
}
