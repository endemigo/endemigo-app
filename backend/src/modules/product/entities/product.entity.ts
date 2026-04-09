import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { Category } from './category.entity';
import { ProductImage } from './product-image.entity';
import { ProductStatus } from '../../../shared/types/product-status.enum';
import { ProductCondition } from '../../../shared/types/product-condition.enum';
import { ListingType } from '../../../shared/types/listing-type.enum';

@Entity('products')
export class Product extends BaseEntity {
  // ─── Core Fields ──────────────────────────────────────────
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  /** Primary image shortcut — backward compat with Phase 1 */
  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  // ─── Seller Relation ──────────────────────────────────────
  @Column()
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  // ─── Category Relation ────────────────────────────────────
  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  // ─── Images (Phase 3) ────────────────────────────────────
  @OneToMany(() => ProductImage, (img) => img.product, { cascade: true })
  images: ProductImage[];

  // ─── Stock (PROD-06) ──────────────────────────────────────
  @Column({ type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ nullable: true })
  sku: string;

  // ─── Geographic Indication (PROD-07) ──────────────────────
  @Column({ nullable: true })
  geoIndicationCertNo: string;

  @Column({ nullable: true })
  geoIndicationRegion: string;

  // ─── Origin / Provenance (PROD-08) ────────────────────────
  @Column({ default: 'TR' })
  originCountry: string;

  @Column({ nullable: true })
  originRegion: string;

  // ─── Condition (PROD-09) ──────────────────────────────────
  @Column({ type: 'enum', enum: ProductCondition, default: ProductCondition.NEW })
  condition: ProductCondition;

  // ─── Listing Type (PROD-10) ───────────────────────────────
  @Column({ type: 'enum', enum: ListingType, default: ListingType.DIRECT_SALE })
  listingType: ListingType;

  // ─── Physical Dimensions (PROD-11) ────────────────────────
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  dimensionWidth: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  dimensionHeight: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  dimensionDepth: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weight: number;

  // ─── Denormalized Counters (Phase 4) ──────────────────────
  @Column({ type: 'int', default: 0 })
  favoriteCount: number;
}
