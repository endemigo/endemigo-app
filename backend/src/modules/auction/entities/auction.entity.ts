import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from '../../product/entities/product.entity';
import { User } from '../../user/entities/user.entity';
import { AuctionStatus } from '../../../shared/types/auction-status.enum';

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

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.25 })
  buyerPremiumRate: number;

  @Column({ type: 'enum', enum: AuctionStatus, default: AuctionStatus.PENDING })
  status: AuctionStatus;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ nullable: true })
  winnerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'winnerId' })
  winner: User;

  @Column({ default: 0 })
  bidCount: number;
}
