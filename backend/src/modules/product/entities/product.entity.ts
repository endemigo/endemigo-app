import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { Category } from './category.entity';
import { ProductImage } from './product-image.entity';
import { ProductStatus } from '../../../shared/types/product-status.enum';
import { ProductCondition } from '../../../shared/types/product-condition.enum';
import { ListingType } from '../../../shared/types/listing-type.enum';
import { GeoIndicationType } from '../../../shared/types/geo-indication-type.enum';
import { ProductProductionSeason } from '../../../shared/types/product-production-season.enum';
import { ProductVariantSku } from './product-variant-sku.entity';

@Entity('products')
export class Product extends BaseEntity {
  // ─── Core Fields ──────────────────────────────────────────
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price: number | null;

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
  categoryId: string | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  // ─── Images (Phase 3) ────────────────────────────────────
  @OneToMany(() => ProductImage, (img) => img.product, { cascade: true })
  images: ProductImage[];

  @OneToMany(() => ProductVariantSku, (sku) => sku.product)
  variantSkus: ProductVariantSku[];

  // ─── Stock (PROD-06) ──────────────────────────────────────
  @Column({ type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ nullable: true })
  sku: string;

  @Column({ nullable: true })
  barcodeNo: string;

  @Column({ type: 'text', nullable: true })
  productContent: string;

  @Column({ type: 'text', nullable: true })
  sellerNotes: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ default: false })
  isEndemigoBrandCandidate: boolean;

  // ─── Geographic Indication (PROD-07) ──────────────────────
  @Column({ nullable: true })
  geoIndicationCertNo: string;

  @Column({ nullable: true })
  geoIndicationRegion: string;

  @Column({ type: 'date', nullable: true })
  geoIndicationReceivedAt: string | null;

  @Column({
    type: 'enum',
    enum: GeoIndicationType,
    nullable: true,
  })
  geoIndicationType: GeoIndicationType | null;

  @Column({
    type: 'enum',
    enum: GeoIndicationType,
    array: true,
    default: '{}',
  })
  geoIndicationTypes: GeoIndicationType[];

  // ─── Origin / Provenance (PROD-08) ────────────────────────
  @Column({ default: 'TR' })
  originCountry: string;

  @Column({ nullable: true })
  originRegion: string;

  @Column({ nullable: true })
  productionProvince: string;

  @Column({ nullable: true })
  productionDistrict: string;

  @Column({
    type: 'enum',
    enum: ProductProductionSeason,
    default: ProductProductionSeason.ALL_TIME,
  })
  productionSeason: ProductProductionSeason;

  @Column({
    type: 'enum',
    enum: ProductProductionSeason,
    array: true,
    default: '{}',
  })
  productionSeasons: ProductProductionSeason[];

  @Column({
    type: 'int',
    array: true,
    default: '{}',
  })
  salesMonths: number[];

  // ─── Condition (PROD-09) ──────────────────────────────────
  @Column({ type: 'enum', enum: ProductCondition, default: ProductCondition.NEW })
  condition: ProductCondition;

  // ─── Listing Type (PROD-10) ───────────────────────────────
  @Column({ type: 'enum', enum: ListingType, default: ListingType.DIRECT_SALE })
  listingType: ListingType;

  @Column({ default: false })
  askPriceEnabled: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  askPriceMinAmount: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  wholesalePrice: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  retailPrice: number | null;

  @Column({ nullable: true })
  shippingProvince: string;

  @Column({ nullable: true })
  shippingDistrict: string;

  @Column({ type: 'text', nullable: true })
  shippingAddress: string;

  @Column({ type: 'text', nullable: true })
  additionalCertificates: string;

  @Column({ nullable: true })
  deliveryTemplateDomestic: string;

  @Column({ nullable: true })
  deliveryTemplateInternational: string;

  @Column({ nullable: true })
  desiDomestic: string;

  @Column({ nullable: true })
  desiInternational: string;

  @Column({ type: 'text', array: true, default: '{}' })
  featureBadges: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  geoBadgeSelections: string[];

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
