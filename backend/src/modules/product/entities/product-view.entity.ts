import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';
import { User } from '../../user/entities/user.entity';

@Entity('product_views')
@Index('idx_product_views_user', ['userId', 'productId'], {
  unique: true,
  where: '"userId" IS NOT NULL',
})
@Index('idx_product_views_device', ['deviceToken', 'productId'], {
  unique: true,
  where: '"userId" IS NULL AND "deviceToken" IS NOT NULL',
})
export class ProductView extends BaseEntity {
  @Column()
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'varchar', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'varchar', nullable: true })
  deviceToken: string | null;

  @Column({ type: 'int', default: 1 })
  viewCount: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  firstViewedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastViewedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  referrer: string | null;

  @Column({ type: 'varchar', nullable: true })
  platform: string | null;
}
