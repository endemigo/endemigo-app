import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Coupon } from './coupon.entity';

@Entity('coupon_redemptions')
@Unique(['orderId'])
@Unique(['couponId', 'userId', 'orderId'])
export class CouponRedemption extends BaseEntity {
  @Column()
  couponId: string;

  @ManyToOne(() => Coupon, (coupon) => coupon.redemptions)
  @JoinColumn({ name: 'couponId' })
  coupon: Coupon;

  @Column()
  userId: string;

  @Column()
  orderId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  discountAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency: string;
}
