import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { Auction } from './auction.entity';
import { AuctionEvent } from './auction-event.entity';
import { AuctionRegistrationStatus } from '@endemigo/shared';

@Entity('auction_registrations')
export class AuctionRegistration extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  auctionId: string | null;

  @ManyToOne(() => Auction, { nullable: true })
  @JoinColumn({ name: 'auctionId' })
  auction: Auction | null;

  @Column({ type: 'uuid', nullable: true })
  eventId: string | null;

  @ManyToOne(() => AuctionEvent, { nullable: true })
  @JoinColumn({ name: 'eventId' })
  event: AuctionEvent | null;

  @Column({
    type: 'enum',
    enum: AuctionRegistrationStatus,
    default: AuctionRegistrationStatus.PENDING,
  })
  status: AuctionRegistrationStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  acceptedTermsAt: Date;
}
