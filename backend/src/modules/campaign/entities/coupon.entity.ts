import { Column, Entity, OneToMany, Unique } from 'typeorm';
import {
  CampaignDiscountType,
  CampaignScopeType,
  CouponStatus,
} from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CouponRedemption } from './coupon-redemption.entity';

@Entity('coupons')
@Unique(['sellerId', 'code'])
export class Coupon extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  sellerId: string | null;

  @Column()
  code: string;

  @Column({ type: 'enum', enum: CouponStatus, default: CouponStatus.DRAFT })
  status: CouponStatus;

  @Column({ type: 'enum', enum: CampaignDiscountType })
  discountType: CampaignDiscountType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  discountValue: number;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  minAmount: number | null;

  @Column({ type: 'int', nullable: true })
  maxUses: number | null;

  @Column({ type: 'int', default: 1 })
  perUserLimit: number;

  @Column({ type: 'enum', enum: CampaignScopeType, nullable: true })
  scopeType: CampaignScopeType | null;

  @Column({ type: 'uuid', nullable: true })
  scopeId: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @OneToMany(() => CouponRedemption, (redemption) => redemption.coupon)
  redemptions: CouponRedemption[];
}
