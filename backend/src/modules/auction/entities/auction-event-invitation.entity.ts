import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { AuctionEvent } from './auction-event.entity';
import { InvitationStatus } from '@endemigo/shared';

@Entity('auction_event_invitations')
export class AuctionEventInvitation extends BaseEntity {
  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => AuctionEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: AuctionEvent;

  @Column({ type: 'uuid' })
  inviteeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inviteeId' })
  invitee: User;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;
}
