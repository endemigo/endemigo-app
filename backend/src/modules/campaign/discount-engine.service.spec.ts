import {
  CampaignDiscountType,
  CampaignScopeType,
  CouponStatus,
} from '@endemigo/shared';
import { DiscountEngineService } from './discount-engine.service';

describe('DiscountEngineService', () => {
  const service = new DiscountEngineService();
  const now = new Date('2026-04-28T12:00:00Z');
  const baseInput = {
    userId: 'buyer-1',
    sellerId: 'seller-1',
    productId: 'product-1',
    categoryId: 'category-1',
    unitPrice: 100,
    quantity: 1,
    couponCode: undefined,
    campaignRules: [],
    coupons: [],
    now,
  };

  it('applies fixed discount', () => {
    const result = service.evaluate({
      ...baseInput,
      campaignRules: [
        {
          id: 'rule-1',
          campaignId: 'campaign-1',
          discountType: CampaignDiscountType.FIXED_AMOUNT,
          discountValue: 25,
          scopeType: CampaignScopeType.PRODUCT,
          scopeId: 'product-1',
        },
      ],
    });

    expect(result.discountAmount).toBe(25);
    expect(result.finalAmount).toBe(75);
  });

  it('applies percentage discount', () => {
    const result = service.evaluate({
      ...baseInput,
      campaignRules: [
        {
          id: 'rule-1',
          campaignId: 'campaign-1',
          discountType: CampaignDiscountType.PERCENTAGE,
          discountValue: 10,
          scopeType: CampaignScopeType.CATEGORY,
          scopeId: 'category-1',
        },
      ],
    });

    expect(result.discountAmount).toBe(10);
  });

  it('rejects outside date range', () => {
    const result = service.evaluate({
      ...baseInput,
      campaignRules: [
        {
          id: 'rule-1',
          campaignId: 'campaign-1',
          discountType: CampaignDiscountType.FIXED_AMOUNT,
          discountValue: 10,
          scopeType: CampaignScopeType.PRODUCT,
          scopeId: 'product-1',
          startsAt: new Date('2026-05-01T00:00:00Z'),
          endsAt: new Date('2026-05-31T00:00:00Z'),
        },
      ],
    });

    expect(result.discountAmount).toBe(0);
    expect(result.rejectedDiscounts[0].reason).toContain('date range');
  });

  it('supports tiered quantity >=5 and >=10', () => {
    const result = service.evaluate({
      ...baseInput,
      quantity: 10,
      campaignRules: [
        {
          id: 'rule-1',
          campaignId: 'campaign-1',
          discountType: CampaignDiscountType.TIERED_QUANTITY,
          discountValue: 0,
          scopeType: CampaignScopeType.PRODUCT,
          scopeId: 'product-1',
          tiers: [
            { minQuantity: 5, discountValue: 50 },
            { minQuantity: 10, discountValue: 125 },
          ],
        },
      ],
    });

    expect(result.originalAmount).toBe(1000);
    expect(result.discountAmount).toBe(125);
  });

  it('supports tiered amount', () => {
    const result = service.evaluate({
      ...baseInput,
      unitPrice: 600,
      campaignRules: [
        {
          id: 'rule-1',
          campaignId: 'campaign-1',
          discountType: CampaignDiscountType.TIERED_AMOUNT,
          discountValue: 0,
          scopeType: CampaignScopeType.CATEGORY,
          scopeId: 'category-1',
          tiers: [
            { minAmount: 300, discountValue: 20 },
            { minAmount: 500, discountValue: 75 },
          ],
        },
      ],
    });

    expect(result.discountAmount).toBe(75);
  });

  it('rejects coupon already used and enforces one coupon', () => {
    const result = service.evaluate({
      ...baseInput,
      couponCode: 'SAVE10',
      coupons: [
        {
          id: 'coupon-1',
          code: 'SAVE10',
          status: CouponStatus.ACTIVE,
          discountType: CampaignDiscountType.FIXED_AMOUNT,
          discountValue: 10,
          startsAt: new Date('2026-04-01T00:00:00Z'),
          endsAt: new Date('2026-04-30T00:00:00Z'),
          perUserLimit: 1,
          userRedemptions: 1,
        },
      ],
    });

    expect(result.discountAmount).toBe(0);
    expect(result.rejectedDiscounts[0].reason).toBe('COUPON_ALREADY_USED');
  });

  it('selects best single discount without stacking', () => {
    const result = service.evaluate({
      ...baseInput,
      couponCode: 'SAVE20',
      campaignRules: [
        {
          id: 'rule-1',
          campaignId: 'campaign-1',
          discountType: CampaignDiscountType.FIXED_AMOUNT,
          discountValue: 10,
          scopeType: CampaignScopeType.PRODUCT,
          scopeId: 'product-1',
        },
      ],
      coupons: [
        {
          id: 'coupon-1',
          code: 'SAVE20',
          status: CouponStatus.ACTIVE,
          discountType: CampaignDiscountType.FIXED_AMOUNT,
          discountValue: 20,
          startsAt: new Date('2026-04-01T00:00:00Z'),
          endsAt: new Date('2026-04-30T00:00:00Z'),
          perUserLimit: 1,
        },
      ],
    });

    expect(result.discountAmount).toBe(20);
    expect(result.appliedDiscount?.source).toBe('coupon');
  });

  it('sets commissionBase equal to final amount', () => {
    const result = service.evaluate({
      ...baseInput,
      campaignRules: [
        {
          id: 'rule-1',
          campaignId: 'campaign-1',
          discountType: CampaignDiscountType.FIXED_AMOUNT,
          discountValue: 15,
          scopeType: CampaignScopeType.PRODUCT,
          scopeId: 'product-1',
        },
      ],
    });

    expect(result.commissionBase).toBe(result.finalAmount);
  });
});
