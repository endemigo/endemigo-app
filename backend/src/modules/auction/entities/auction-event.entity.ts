import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AuctionEventStatus, AuctionType, AuctionEventSystemType, JointManagementType } from '@endemigo/shared';
import { Category } from '../../product/entities/category.entity';

@Entity('auction_events')
export class AuctionEvent extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;

  @Column({ type: 'uuid', nullable: true })
  ownerId: string | null;

  // Faz 6: Canlı yayını yürütecek kişi (kreatör/operatör). Sahip ≠ yayıncı olabilir.
  // Seller-oluşturanlarda varsayılan = ownerId; endemigo-yönetilende admin atar.
  @Column({ type: 'uuid', nullable: true })
  auctioneerId: string | null;

  @Column({
    type: 'enum',
    enum: AuctionEventSystemType,
    default: AuctionEventSystemType.ENDEMIGO_MANAGED,
  })
  eventType: AuctionEventSystemType;

  @Column({
    type: 'enum',
    enum: JointManagementType,
    nullable: true,
  })
  jointManagementType: JointManagementType | null;

  @Column({ type: 'int', default: 0 })
  minProductsCount: number;

  // Ortak müzayedede açık ürün çağrısı: açıksa davetsiz tedarikçiler
  // (≥20 aktif ürün şartıyla) etkinliğe ürün başvurusu yapabilir.
  @Column({ default: false })
  openCallEnabled: boolean;

  @Column({ type: 'int', default: 0 })
  maxProductsCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  dealerCommissionRate: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  endemigoCommissionRate: number | null;

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

  // Otomatik lot geçişi; restart'ta kaybolmaması için DB'de tutulur.
  @Column({ default: true })
  autoProgressEnabled: boolean;
}
