import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { Product } from '../../product/entities/product.entity';
import { VariantNumber } from '../../product/entities/variant-number.entity';
import { ProductVariantSku } from '../../product/entities/product-variant-sku.entity';

@Entity('cart_items')
@Index('UQ_cart_items_user_product_variant', ['userId', 'productId', 'variantNumberId'], { unique: true })
@Index('UQ_cart_items_user_product_sku', ['userId', 'productId', 'productVariantSkuId'], { unique: true })
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

  @Column({ type: 'int', default: 1 })
  quantity: number;
}
