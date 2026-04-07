import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Auction } from './auction.entity';
import { User } from '../../user/entities/user.entity';

@Entity('bids')
export class Bid extends BaseEntity {
  @Column()
  auctionId: string;

  @ManyToOne(() => Auction)
  @JoinColumn({ name: 'auctionId' })
  auction: Auction;

  @Column()
  bidderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'bidderId' })
  bidder: User;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  premiumAmount: number;
}
