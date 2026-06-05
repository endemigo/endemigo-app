import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AuctionEventStatus, AuctionType } from '@endemigo/shared';

@Entity('auction_events')
export class AuctionEvent extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  coverImageUrl: string | null;

  @Column({
    type: 'enum',
    enum: AuctionEventStatus,
    default: AuctionEventStatus.DRAFT,
  })
  status: AuctionEventStatus;

  @Column({
    type: 'enum',
    enum: AuctionType,
    default: AuctionType.REALTIME,
  })
  auctionType: AuctionType;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  submissionDeadline: Date | null;

  @Column({ type: 'uuid', nullable: true })
  activeLotId: string | null;
}
