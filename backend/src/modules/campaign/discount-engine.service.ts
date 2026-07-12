import { Injectable } from '@nestjs/common';
import {
  CampaignDiscountType,
  CampaignScopeType,
  CouponStatus,
} from '@endemigo/shared';

export interface DiscountTier {
  minAmount?: number;
  minQuantity?: number;
  discountType?: CampaignDiscountType;
  discountValue: number;
}

export interface CampaignRuleInput {
  id: string;
  campaignId: string;
  discountType: CampaignDiscountType;
  discountValue: number;
  scopeType: CampaignScopeType;
  scopeId: string;
  minAmount?: number | null;
  minQuantity?: number | null;
  tiers?: DiscountTier[];
  startsAt?: Date;
  endsAt?: Date;
}

export interface CouponInput {
  id: string;
  code: string;
  status: CouponStatus;
  discountType: CampaignDiscountType;
  discountValue: number;
  startsAt: Date;
  endsAt: Date;
  minAmount?: number | null;
  maxUses?: number | null;
  perUserLimit: number;
  scopeType?: CampaignScopeType | null;
  scopeId?: string | null;
  totalRedemptions?: number;
  userRedemptions?: number;
}

export interface DiscountEvaluationInput {
  userId: string;
  sellerId: string;
  productId: string;
  categoryId?: string | null;
  unitPrice: number;
  quantity: number;
  couponCode?: string;
  campaignRules: CampaignRuleInput[];
  coupons: CouponInput[];
  now: Date;
}

export interface AppliedDiscount {
  source: 'campaign' | 'coupon';
  id: string;
  code?: string;
  discountType: CampaignDiscountType;
  discountAmount: number;
}

export interface RejectedDiscount {
  source: 'campaign' | 'coupon';
  id: string;
  reason: string;
}

export interface DiscountEvaluationResult {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  finalDiscounted: number;
  commissionBase: number;
  appliedDiscount: AppliedDiscount | null;
  rejectedDiscounts: RejectedDiscount[];
}

@Injectable()
export class DiscountEngineService {
  evaluate(input: DiscountEvaluationInput): DiscountEvaluationResult {
    const originalAmount = this.roundMoney(input.unitPrice * input.quantity);
    const candidates: AppliedDiscount[] = [];
    const rejectedDiscounts: RejectedDiscount[] = [];

    input.campaignRules.forEach((rule) => {
      const rejection = this.getRuleRejection(rule, input, originalAmount);
      if (rejection) {
        rejectedDiscounts.push({
          source: 'campaign',
          id: rule.id,
          reason: rejection,
        });
        return;
      }
      candidates.push({
        source: 'campaign',
        id: rule.id,
        discountType: rule.discountType,
        discountAmount: this.calculateDiscount(
          rule,
          originalAmount,
          input.quantity,
        ),
      });
    });

    input.coupons.forEach((coupon) => {
      const rejection = this.getCouponRejection(coupon, input, originalAmount);
      if (rejection) {
        rejectedDiscounts.push({
          source: 'coupon',
          id: coupon.id,
          reason: rejection,
        });
        return;
      }
      candidates.push({
        source: 'coupon',
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountAmount: this.calculateDiscount(
          coupon,
          originalAmount,
          input.quantity,
        ),
      });
    });

    const appliedDiscount =
      candidates
        .map((candidate) => ({
          ...candidate,
          discountAmount: Math.min(
            originalAmount,
            this.roundMoney(candidate.discountAmount),
          ),
        }))
        .sort((left, right) => right.discountAmount - left.discountAmount)[0] ??
      null;

    const discountAmount = appliedDiscount?.discountAmount ?? 0;
    const finalAmount = this.roundMoney(
      Math.max(0, originalAmount - discountAmount),
    );

    return {
      originalAmount,
      discountAmount,
      finalAmount,
      finalDiscounted: finalAmount,
      commissionBase: finalAmount,
      appliedDiscount,
      rejectedDiscounts,
    };
  }

  private getRuleRejection(
    rule: CampaignRuleInput,
    input: DiscountEvaluationInput,
    originalAmount: number,
  ): string | null {
    if (!this.isInWindow(input.now, rule.startsAt, rule.endsAt))
      return 'outside date range';
    if (!this.scopeMatches(rule.scopeType, rule.scopeId, input))
      return 'scope mismatch';
    if (rule.minAmount && originalAmount < Number(rule.minAmount))
      return 'amount threshold not met';
    if (rule.minQuantity && input.quantity < Number(rule.minQuantity))
      return 'quantity threshold not met';
    return null;
  }

  private getCouponRejection(
    coupon: CouponInput,
    input: DiscountEvaluationInput,
    originalAmount: number,
  ): string | null {
    if (!input.couponCode) return 'one coupon required for coupon discount';
    if (coupon.code.toUpperCase() !== input.couponCode.toUpperCase())
      return 'different coupon';
    if (coupon.status !== CouponStatus.ACTIVE) return 'coupon inactive';
    if (!this.isInWindow(input.now, coupon.startsAt, coupon.endsAt))
      return 'outside date range';
    if (
      coupon.scopeType &&
      coupon.scopeId &&
      !this.scopeMatches(coupon.scopeType, coupon.scopeId, input)
    ) {
      return 'scope mismatch';
    }
    if (coupon.minAmount && originalAmount < Number(coupon.minAmount))
      return 'amount threshold not met';
    if (coupon.maxUses && (coupon.totalRedemptions ?? 0) >= coupon.maxUses)
      return 'coupon max uses reached';
    if ((coupon.userRedemptions ?? 0) >= coupon.perUserLimit)
      return 'COUPON_ALREADY_USED';
    return null;
  }

  private scopeMatches(
    scopeType: CampaignScopeType,
    scopeId: string,
    input: DiscountEvaluationInput,
  ) {
    if (scopeType === CampaignScopeType.PRODUCT)
      return input.productId === scopeId;
    return input.categoryId === scopeId;
  }

  private calculateDiscount(
    discount: Pick<
      CampaignRuleInput,
      'discountType' | 'discountValue' | 'tiers'
    >,
    originalAmount: number,
    quantity: number,
  ) {
    if (
      discount.discountType === CampaignDiscountType.TIERED_AMOUNT ||
      discount.discountType === CampaignDiscountType.TIERED_QUANTITY
    ) {
      const tier = this.selectTier(
        discount.tiers ?? [],
        originalAmount,
        quantity,
      );
      if (!tier) return 0;
      return this.calculateSimpleDiscount(
        tier.discountType ?? CampaignDiscountType.FIXED_AMOUNT,
        tier.discountValue,
        originalAmount,
      );
    }

    return this.calculateSimpleDiscount(
      discount.discountType,
      discount.discountValue,
      originalAmount,
    );
  }

  private calculateSimpleDiscount(
    discountType: CampaignDiscountType,
    discountValue: number,
    originalAmount: number,
  ) {
    if (discountType === CampaignDiscountType.PERCENTAGE) {
      return originalAmount * (Number(discountValue) / 100);
    }
    return Number(discountValue);
  }

  private selectTier(
    tiers: DiscountTier[],
    originalAmount: number,
    quantity: number,
  ) {
    return tiers
      .filter((tier) => {
        const amountOk =
          tier.minAmount === undefined || originalAmount >= tier.minAmount;
        const quantityOk =
          tier.minQuantity === undefined || quantity >= tier.minQuantity;
        return amountOk && quantityOk;
      })
      .sort((left, right) => {
        const leftScore = left.minAmount ?? left.minQuantity ?? 0;
        const rightScore = right.minAmount ?? right.minQuantity ?? 0;
        return rightScore - leftScore;
      })[0];
  }

  private isInWindow(now: Date, startsAt?: Date, endsAt?: Date) {
    if (startsAt && startsAt.getTime() > now.getTime()) return false;
    if (endsAt && endsAt.getTime() < now.getTime()) return false;
    return true;
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }
}
