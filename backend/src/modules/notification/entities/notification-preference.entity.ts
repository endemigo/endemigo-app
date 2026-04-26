import { NotificationEventType } from '@endemigo/shared';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

export type NotificationChannelPreference = {
  inApp: boolean;
  push: boolean;
};

export type NotificationPreferenceChannels = Partial<
  Record<NotificationEventType, NotificationChannelPreference>
>;

@Entity('notification_preferences')
export class NotificationPreference extends BaseEntity {
  @Column({ unique: true })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'jsonb', default: {} })
  channels: NotificationPreferenceChannels;
}
