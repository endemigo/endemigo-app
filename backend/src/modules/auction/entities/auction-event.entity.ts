import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AuctionEventStatus, AuctionType } from '@endemigo/shared';
import { Category } from '../../product/entities/category.entity';

@Entity('auction_events')
export class AuctionEvent extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;
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

  @Column({ default: true })
  antiSnipingEnabled: boolean;

  @Column({ default: 5 })
  maxExtensions: number;

  @Column({ default: 60 })
  extensionSeconds: number;

  @Column({ default: 60 })
  extensionDuration: number;

  @Column({ default: 30 })
  lotTransitionSeconds: number;
}
