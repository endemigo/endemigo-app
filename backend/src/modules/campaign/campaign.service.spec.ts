import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  CampaignDiscountType,
  CampaignScopeType,
  CampaignStatus,
  CouponStatus,
  RC,
} from '@endemigo/shared';
import { CampaignService } from './campaign.service';
import { DiscountEngineService } from './discount-engine.service';
import { TrustService } from '../trust/trust.service';

describe('CampaignService', () => {
  let campaignRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let campaignRuleRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let couponRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
    findOne: jest.Mock;
  };
  let couponRedemptionRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    count: jest.Mock;
  };
  let productRepo: {
    findOne: jest.Mock;
  };
  let trustService: {
    assertAllowed: jest.Mock;
  };
  let service: CampaignService;

  beforeEach(() => {
    campaignRepo = {
      create: jest.fn((value) => ({ id: 'campaign-1', ...value })),
      save: jest.fn((value) => Promise.resolve({ id: 'campaign-1', ...value })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    campaignRuleRepo = {
      create: jest.fn((value) => ({ id: 'rule-1', ...value })),
      save: jest.fn((value) => Promise.resolve(value)),
      find: jest.fn().mockResolvedValue([]),
    };
    couponRepo = {
      create: jest.fn((value) => ({ id: 'coupon-1', ...value })),
      save: jest.fn((value) => Promise.resolve({ id: 'coupon-1', ...value })),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockResolvedValue(null),
    };
    couponRedemptionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => ({ id: 'redemption-1', ...value })),
      save: jest.fn((value) => Promise.resolve({ id: 'redemption-1', ...value })),
      count: jest.fn().mockResolvedValue(0),
    };
    productRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'product-1', sellerId: 'seller-1' }),
    };
    trustService = {
      assertAllowed: jest.fn().mockResolvedValue({ allowed: true }),
    };
    service = new CampaignService(
      campaignRepo as never,
      campaignRuleRepo as never,
      couponRepo as never,
      couponRedemptionRepo as never,
      productRepo as never,
      new DiscountEngineService(),
      trustService as unknown as TrustService,
    );
  });

  it('supports platform campaign opt-in', async () => {
    campaignRepo.findOne.mockResolvedValue({
      id: 'campaign-1',
      isPlatform: true,
      requiresSellerOptIn: true,
      metadata: {},
    });

    const result = await service.optInPlatformCampaign('seller-1', 'campaign-1');

    expect(result.code).toBe(RC.CAMPAIGN_OPTED_IN);
    expect(campaignRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { optedInSellerIds: ['seller-1'] },
      }),
    );
  });

  it('creates coupon with usage limit', async () => {
    const result = await service.createCoupon('seller-1', {
      code: 'save10',
      discountType: CampaignDiscountType.FIXED_AMOUNT,
      discountValue: 10,
      startsAt: '2026-04-01T00:00:00Z',
      endsAt: '2026-04-30T00:00:00Z',
      maxUses: 100,
      perUserLimit: 1,
    });

    expect(result.code).toBe(RC.COUPON_CREATED);
    expect(couponRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SAVE10',
        status: CouponStatus.ACTIVE,
        maxUses: 100,
      }),
    );
  });

  it('lists admin coupons with seller and status filters', async () => {
    couponRepo.find.mockResolvedValueOnce([
      {
        id: 'coupon-1',
        sellerId: 'seller-1',
        code: 'SAVE10',
        status: CouponStatus.ACTIVE,
        discountType: CampaignDiscountType.FIXED_AMOUNT,
        discountValue: 10,
        startsAt: new Date('2026-04-01T00:00:00Z'),
        endsAt: new Date('2026-04-30T00:00:00Z'),
        minAmount: 200,
        maxUses: 100,
        perUserLimit: 1,
        scopeType: CampaignScopeType.CATEGORY,
        scopeId: '11111111-1111-1111-1111-111111111111',
        createdAt: new Date('2026-04-01T00:00:00Z'),
      },
    ]);
    couponRepo.count.mockResolvedValueOnce(1);
    couponRedemptionRepo.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(12);

    const result = await service.listAdminCoupons({
      page: '1',
      limit: '25',
      sellerId: 'seller-1',
      status: CouponStatus.ACTIVE,
    });

    expect(result.resource).toBe('coupons');
    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        totalRedemptions: 12,
        remainingUses: 88,
      }),
    );
    expect(couponRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sellerId: 'seller-1',
          status: CouponStatus.ACTIVE,
        }),
      }),
    );
    expect(couponRepo.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sellerId: 'seller-1',
          status: CouponStatus.ACTIVE,
        }),
      }),
    );
  });

  it('updates admin coupon fields', async () => {
    couponRepo.findOne = jest.fn().mockResolvedValueOnce({
      id: 'coupon-1',
      sellerId: null,
      code: 'SAVE10',
      status: CouponStatus.ACTIVE,
      discountType: CampaignDiscountType.FIXED_AMOUNT,
      discountValue: 10,
      startsAt: new Date('2026-04-01T00:00:00Z'),
      endsAt: new Date('2026-04-30T00:00:00Z'),
      minAmount: 100,
      maxUses: 100,
      perUserLimit: 1,
      scopeType: CampaignScopeType.CATEGORY,
      scopeId: '11111111-1111-1111-1111-111111111111',
      metadata: {},
    });

    const result = await service.updateCoupon('coupon-1', {
      code: 'save20',
      discountValue: 20,
      minAmount: 250,
      maxUses: 200,
      perUserLimit: 2,
    });

    expect(result.code).toBe(RC.COUPON_UPDATED);
    expect(couponRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SAVE20',
        discountValue: 20,
        minAmount: 250,
        maxUses: 200,
        perUserLimit: 2,
      }),
    );
  });

  it('updates admin coupon status', async () => {
    couponRepo.findOne = jest.fn().mockResolvedValueOnce({
      id: 'coupon-1',
      sellerId: null,
      code: 'SAVE10',
      status: CouponStatus.ACTIVE,
      discountType: CampaignDiscountType.FIXED_AMOUNT,
      discountValue: 10,
      startsAt: new Date('2026-04-01T00:00:00Z'),
      endsAt: new Date('2026-04-30T00:00:00Z'),
      minAmount: null,
      maxUses: null,
      perUserLimit: 1,
      scopeType: null,
      scopeId: null,
      metadata: {},
    });

    const result = await service.updateCouponStatus('coupon-1', CouponStatus.DISABLED);

    expect(result.code).toBe(RC.COUPON_STATUS_UPDATED);
    expect(couponRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: CouponStatus.DISABLED,
      }),
    );
  });

  it('rejects one coupon reuse with COUPON_ALREADY_USED', async () => {
    couponRedemptionRepo.findOne.mockResolvedValue({ id: 'redemption-1' });

    await expect(
      service.recordCouponRedemption({
        couponId: 'coupon-1',
        userId: 'buyer-1',
        orderId: 'order-1',
        discountAmount: 10,
        currency: 'TRY',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('keeps the best single discount and exposes final discounted commission base', async () => {
    campaignRuleRepo.find.mockResolvedValueOnce([
      {
        id: 'rule-10',
        campaignId: 'campaign-1',
        discountType: CampaignDiscountType.FIXED_AMOUNT,
        discountValue: 10,
        scopeType: CampaignScopeType.PRODUCT,
        scopeId: 'product-1',
        minAmount: null,
        minQuantity: null,
        tiers: [],
        campaign: { sellerId: 'seller-1', metadata: {} },
      },
      {
        id: 'rule-25',
        campaignId: 'campaign-2',
        discountType: CampaignDiscountType.FIXED_AMOUNT,
        discountValue: 25,
        scopeType: CampaignScopeType.PRODUCT,
        scopeId: 'product-1',
        minAmount: null,
        minQuantity: null,
        tiers: [],
        campaign: { sellerId: 'seller-1', metadata: {} },
      },
    ]);
    couponRepo.find.mockResolvedValueOnce([]);

    const result = await service.evaluateOrderDiscount({
      userId: 'buyer-1',
      sellerId: 'seller-1',
      productId: 'product-1',
      unitPrice: 100,
      quantity: 1,
      now: new Date('2026-04-10T00:00:00Z'),
    });

    expect(result.appliedDiscount?.id).toBe('rule-25');
    expect(result.finalDiscounted).toBe(75);
    expect(result.commissionBase).toBe(75);
  });

  it('marks campaign expired when date range is already over', async () => {
    const result = await service.createCampaign('seller-1', {
      name: 'Expired',
      startsAt: '2025-01-01T00:00:00Z',
      endsAt: '2025-01-02T00:00:00Z',
      rules: [
        {
          discountType: CampaignDiscountType.FIXED_AMOUNT,
          discountValue: 5,
          scopeType: CampaignScopeType.PRODUCT,
          scopeId: 'product-1',
        },
      ],
    });

    expect(result.campaign.status).toBe(CampaignStatus.EXPIRED);
  });

  it('enforces seller product/category targeting ownership', async () => {
    productRepo.findOne.mockResolvedValue({ id: 'product-1', sellerId: 'other-seller' });

    await expect(
      service.createCoupon('seller-1', {
        code: 'SAVE',
        discountType: CampaignDiscountType.FIXED_AMOUNT,
        discountValue: 10,
        startsAt: '2026-04-01T00:00:00Z',
        endsAt: '2026-04-30T00:00:00Z',
        scopeType: CampaignScopeType.PRODUCT,
        scopeId: 'product-1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('pauses active campaigns and coupons when ADS_CAMPAIGNS_LOCK blocks creation', async () => {
    trustService.assertAllowed.mockRejectedValueOnce(
      new ForbiddenException({ code: RC.FORBIDDEN, message: 'locked' }),
    );
    campaignRepo.find.mockResolvedValueOnce([
      {
        id: 'campaign-1',
        sellerId: 'seller-1',
        status: CampaignStatus.ACTIVE,
        metadata: {},
      },
    ]);
    couponRepo.find.mockResolvedValueOnce([
      {
        id: 'coupon-1',
        sellerId: 'seller-1',
        status: CouponStatus.ACTIVE,
        metadata: {},
      },
    ]);

    await expect(
      service.createCoupon('seller-1', {
        code: 'LOCKED',
        discountType: CampaignDiscountType.FIXED_AMOUNT,
        discountValue: 10,
        startsAt: '2026-04-01T00:00:00Z',
        endsAt: '2026-04-30T00:00:00Z',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(campaignRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          pausedByRestriction: 'ADS_CAMPAIGNS_LOCK',
        }),
      }),
    );
    expect(couponRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          pausedByRestriction: 'ADS_CAMPAIGNS_LOCK',
        }),
      }),
    );
  });
});
