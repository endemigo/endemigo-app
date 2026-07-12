import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';
import { VariantNumber } from './variant-number.entity';

@Entity('product_variant_skus')
@Unique('UQ_product_variant_skus_product_color_size', [
  'productId',
  'colorVariantNumberId',
  'sizeVariantNumberId',
])
export class ProductVariantSku extends BaseEntity {
  @Column()
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'uuid', nullable: true })
  colorVariantNumberId: string | null;

  @ManyToOne(() => VariantNumber, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'colorVariantNumberId' })
  colorVariantNumber: VariantNumber | null;

  @Column({ type: 'uuid', nullable: true })
  sizeVariantNumberId: string | null;

  @ManyToOne(() => VariantNumber, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sizeVariantNumberId' })
  sizeVariantNumber: VariantNumber | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  skuCode: string | null;

  @Column({ type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceOverride: number | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
