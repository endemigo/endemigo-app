import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from '../../product/entities/product.entity';
import { User } from '../../user/entities/user.entity';
import { AuctionPaymentStatus, AuctionStatus, AuctionType, AuctionApprovalStatus } from '@endemigo/shared';
import { AuctionEvent } from './auction-event.entity';

@Entity('auctions')
export class Auction extends BaseEntity {
  @Column()
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  startPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  currentPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 1.0 })
  minIncrement: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  reservePrice: number | null;

  @Column({ default: false })
  reserveMet: boolean;


  @Column({ type: 'enum', enum: AuctionStatus, default: AuctionStatus.DRAFT })
  status: AuctionStatus;

  @Column({ type: 'enum', enum: AuctionType, default: AuctionType.REALTIME })
  auctionType: AuctionType;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ nullable: true })
  winnerId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'winnerId' })
  winner: User;

  @Column({
    type: 'enum',
    enum: AuctionPaymentStatus,
    default: AuctionPaymentStatus.NONE,
  })
  winnerPaymentStatus: AuctionPaymentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  winnerPaymentDeadlineAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  winnerPaymentCompletedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  winningBidId: string | null;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ default: 0 })
  fallbackRound: number;

  @Column({ default: 0 })
  paymentAttemptCount: number;

  @Column({ default: 0 })
  bidCount: number;

  // ─── LOT Numaralama (AUCT-17) ────────────────────────
  @Column({ nullable: true, unique: true })
  lotNumber: string; // LOT-YYYYMM-XXXXX

  // ─── Anti-Sniping (AUCT-06, AUCT-11) ─────────────────
  @Column({ default: true })
  antiSnipingEnabled: boolean;

  @Column({ default: 10 })
  maxExtensions: number;

  @Column({ default: 0 })
  currentExtensions: number;

  @Column({ default: 60 })
  extensionSeconds: number;

  @Column({ default: 60 })
  extensionDuration: number;

  // ─── Oda Kapasitesi (AUCT-13) ─────────────────────────
  @Column({ nullable: true })
  roomCapacity: number;

  // ─── Ortak Müzayede Etkinliği (Model 2) ───────────────
  @Column({ type: 'uuid', nullable: true })
  eventId: string | null;

  @ManyToOne(() => AuctionEvent, { nullable: true })
  @JoinColumn({ name: 'eventId' })
  event: AuctionEvent | null;

  @Column({
    type: 'enum',
    enum: AuctionApprovalStatus,
    default: AuctionApprovalStatus.APPROVED, // legacy/standalone is auto-approved, applications start as PENDING
  })
  approvalStatus: AuctionApprovalStatus;

  @Column({ type: 'int', nullable: true })
  sequenceNumber: number | null;

  // ─── Kültür Varlığı (AUCT-18) ─────────────────────────
  @Column({ default: false })
  culturalAssetRestricted: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  requiredDeposit: number;
}
