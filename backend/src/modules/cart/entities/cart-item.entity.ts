import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { Product } from '../../product/entities/product.entity';
import { VariantNumber } from '../../product/entities/variant-number.entity';
import { ProductVariantSku } from '../../product/entities/product-variant-sku.entity';
import { Auction } from '../../auction/entities/auction.entity';

@Entity('cart_items')
@Index(
  'UQ_cart_items_user_product_variant',
  ['userId', 'productId', 'variantNumberId'],
  { unique: true },
)
@Index(
  'UQ_cart_items_user_product_sku',
  ['userId', 'productId', 'productVariantSkuId'],
  { unique: true },
)
@Index('IDX_cart_items_user_created', ['userId', 'createdAt'])
export class CartItem extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'uuid', nullable: true })
  variantNumberId: string | null;

  @ManyToOne(() => VariantNumber, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'variantNumberId' })
  variantNumber: VariantNumber | null;

  @Column({ type: 'uuid', nullable: true })
  productVariantSkuId: string | null;

  @ManyToOne(() => ProductVariantSku, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productVariantSkuId' })
  productVariantSku: ProductVariantSku | null;

  @Column({ type: 'uuid', nullable: true })
  auctionId: string | null;

  @ManyToOne(() => Auction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auctionId' })
  auction: Auction | null;

  // Fiyat-sor akışında kabul edilen teklifin kimliği; customPrice bu teklifin
  // tutarını taşır ve checkout ödeme tutarı olarak bunu okur.
  @Column({ type: 'uuid', nullable: true })
  offerId: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  customPrice: number | null;

  @Column({ type: 'int', default: 1 })
  quantity: number;
}
