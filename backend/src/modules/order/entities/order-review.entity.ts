import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('order_reviews')
@Index(['orderId'], { unique: true })
export class OrderReview extends BaseEntity {
  @Column()
  orderId: string;

  @Column()
  productId: string;

  @Column()
  sellerId: string;

  @Column()
  buyerId: string;

  @Column({ type: 'int' })
  productRating: number;

  @Column({ type: 'text', nullable: true })
  productComment: string | null;

  @Column({ type: 'int' })
  sellerRating: number;

  @Column({ type: 'text', nullable: true })
  sellerComment: string | null;
}
