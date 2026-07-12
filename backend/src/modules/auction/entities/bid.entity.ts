import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Auction } from './auction.entity';
import { User } from '../../user/entities/user.entity';
import { BidStatus } from '../../../shared/types/bid-status.enum';

@Entity('bids')
@Index('IDX_bids_one_winning_per_auction', ['auctionId'], {
  unique: true,
  where: '"isWinningBid" = true',
})
@Index('IDX_bids_auction_status_amount', ['auctionId', 'status', 'amount'])
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

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxAmount: number | null;

  // ─── Phase 5 Fields ────────────────────────────────────
  @Column({ type: 'enum', enum: BidStatus, default: BidStatus.ACTIVE })
  status: BidStatus;

  @Column({ default: false })
  isWinningBid: boolean;

  @Column({ nullable: true })
  ipAddress: string;
}
