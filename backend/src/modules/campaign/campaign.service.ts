import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CampaignDiscountType,
  CampaignScopeType,
  CampaignStatus,
  CouponStatus,
  RC,
} from '@endemigo/shared';
import { IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { AdminCouponListQueryDto } from './dto/admin-coupon-list-query.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { Campaign } from './entities/campaign.entity';
import { CampaignRule } from './entities/campaign-rule.entity';
import { Coupon } from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon-redemption.entity';
import {
  DiscountEngineService,
  DiscountEvaluationResult,
} from './discount-engine.service';
import { TrustService } from '../trust/trust.service';

interface OrderDiscountInput {
  userId: string;
  sellerId: string;
  productId: string;
  categoryId?: string | null;
  unitPrice: number;
  quantity: number;
  couponCode?: string;
  now?: Date;
}

@Injectable()
export class CampaignService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignRule)
    private readonly campaignRuleRepo: Repository<CampaignRule>,
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(CouponRedemption)
    private readonly couponRedemptionRepo: Repository<CouponRedemption>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly discountEngineService: DiscountEngineService,
    @Optional()
    private readonly trustService?: TrustService,
  ) {}

  async createCampaign(
    sellerId: string | null,
    dto: CreateCampaignDto,
    options: { adminPlatform?: boolean } = {},
  ) {
    if (dto.isPlatform && !options.adminPlatform) {
      throw new ForbiddenException({
        code: RC.ADMIN_FORBIDDEN,
        message: 'Platform kampanyasını sadece admin oluşturabilir',
      });
    }

    await this.assertAdsCampaignsAllowed(sellerId);
    await this.assertSellerOwnsScopes(sellerId, dto.rules);
    const campaign = this.campaignRepo.create({
      sellerId: dto.isPlatform ? null : sellerId,
      name: dto.name,
      status: this.resolveInitialCampaignStatus(dto.startsAt, dto.endsAt),
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      isPlatform: dto.isPlatform ?? false,
      requiresSellerOptIn: dto.requiresSellerOptIn ?? false,
      metadata: {},
    });
    const savedCampaign = await this.campaignRepo.save(campaign);
    const rules = await this.campaignRuleRepo.save(
      dto.rules.map((rule) =>
        this.campaignRuleRepo.create({
          campaignId: savedCampaign.id,
          discountType: rule.discountType,
          discountValue: rule.discountValue,
          scopeType: rule.scopeType,
          scopeId: rule.scopeId,
          minAmount: rule.minAmount ?? null,
          minQuantity: rule.minQuantity ?? null,
          tiers: rule.tiers ?? [],
        }),
      ),
    );

    return {
      code: RC.CAMPAIGN_CREATED,
      message: 'Kampanya oluşturuldu',
      campaign: { ...savedCampaign, rules },
    };
  }

  async listMyCampaigns(sellerId: string) {
    const items = await this.campaignRepo.find({
      where: [{ sellerId }, { isPlatform: true }],
      relations: ['rules'],
      order: { createdAt: 'DESC' },
    });
    return { code: RC.SUCCESS, message: 'Kampanyalar getirildi', items };
  }

  async optInPlatformCampaign(sellerId: string, campaignId: string) {
    await this.assertAdsCampaignsAllowed(sellerId);
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId, isPlatform: true },
    });
    if (!campaign) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Platform kampanyası bulunamadı',
      });
    }
    if (!campaign.requiresSellerOptIn) {
      return {
        code: RC.CAMPAIGN_OPTED_IN,
        message: 'Kampanya zaten tüm satıcılara açık',
        campaign,
      };
    }

    const optedInSellerIds = this.getStringArray(campaign.metadata.optedInSellerIds);
    if (!optedInSellerIds.includes(sellerId)) optedInSellerIds.push(sellerId);
    campaign.metadata = { ...campaign.metadata, optedInSellerIds };
    const saved = await this.campaignRepo.save(campaign);
    return {
      code: RC.CAMPAIGN_OPTED_IN,
      message: 'Platform kampanyasına opt-in yapıldı',
      campaign: saved,
    };
  }

  async createCoupon(sellerId: string | null, dto: CreateCouponDto) {
    await this.assertAdsCampaignsAllowed(sellerId);
    if (dto.scopeType && dto.scopeId) {
      await this.assertSellerOwnsScopes(sellerId, [
        {
          scopeType: dto.scopeType,
          scopeId: dto.scopeId,
          discountType: dto.discountType,
          discountValue: dto.discountValue,
        },
      ]);
    }

    const coupon = this.couponRepo.create({
      sellerId,
      code: dto.code.trim().toUpperCase(),
      status: CouponStatus.ACTIVE,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      minAmount: dto.minAmount ?? null,
      maxUses: dto.maxUses ?? null,
      perUserLimit: dto.perUserLimit ?? 1,
      scopeType: dto.scopeType ?? null,
      scopeId: dto.scopeId ?? null,
      metadata: {},
    });
    const saved = await this.couponRepo.save(coupon);
    return {
      code: RC.COUPON_CREATED,
      message: 'Kupon oluşturuldu',
      coupon: saved,
    };
  }

  async listMyCoupons(sellerId: string) {
    const items = await this.couponRepo.find({
      where: [{ sellerId }, { sellerId: IsNull() }],
      order: { createdAt: 'DESC' },
    });
    return { code: RC.SUCCESS, message: 'Kuponlar getirildi', items };
  }

  async listAdminCoupons(query: AdminCouponListQueryDto) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 100);
    const where = {
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
      ...(query.status ? { status: query.status as CouponStatus } : {}),
    };

    const [items, total] = await Promise.all([
      this.couponRepo.find({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.couponRepo.count({ where }),
    ]);

    const itemsWithStats = await Promise.all(
      items.map(async (coupon) => {
        const totalRedemptions = await this.couponRedemptionRepo.count({
          where: { couponId: coupon.id },
        });
        return {
          ...coupon,
          totalRedemptions,
          remainingUses:
            coupon.maxUses === null ? null : Math.max(coupon.maxUses - totalRedemptions, 0),
        };
      }),
    );

    return {
      code: RC.SUCCESS,
      message: 'Admin kuponları getirildi',
      resource: 'coupons',
      items: itemsWithStats,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async updateCoupon(id: string, dto: UpdateCouponDto) {
    const coupon = await this.findCouponOrFail(id);

    if (dto.scopeType && dto.scopeId && coupon.sellerId) {
      await this.assertSellerOwnsScopes(coupon.sellerId, [
        {
          scopeType: dto.scopeType,
          scopeId: dto.scopeId,
          discountType: dto.discountType ?? coupon.discountType,
          discountValue: dto.discountValue ?? Number(coupon.discountValue),
        },
      ]);
    }

    if (dto.code !== undefined) coupon.code = dto.code.trim().toUpperCase();
    if (dto.discountType !== undefined) coupon.discountType = dto.discountType;
    if (dto.discountValue !== undefined) coupon.discountValue = dto.discountValue;
    if (dto.startsAt !== undefined) coupon.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) coupon.endsAt = new Date(dto.endsAt);
    if (dto.minAmount !== undefined) coupon.minAmount = dto.minAmount;
    if (dto.maxUses !== undefined) coupon.maxUses = dto.maxUses;
    if (dto.perUserLimit !== undefined) coupon.perUserLimit = dto.perUserLimit;
    if (dto.scopeType !== undefined) coupon.scopeType = dto.scopeType;
    if (dto.scopeId !== undefined) coupon.scopeId = dto.scopeId;

    const saved = await this.couponRepo.save(coupon);
    return {
      code: RC.COUPON_UPDATED,
      message: 'Kupon güncellendi',
      coupon: saved,
    };
  }

  async updateCouponStatus(id: string, status: CouponStatus) {
    const coupon = await this.findCouponOrFail(id);
    coupon.status = status;
    const saved = await this.couponRepo.save(coupon);
    return {
      code: RC.COUPON_STATUS_UPDATED,
      message: 'Kupon durumu güncellendi',
      coupon: saved,
    };
  }

  async evaluateOrderDiscount(
    input: OrderDiscountInput,
  ): Promise<DiscountEvaluationResult> {
    const now = input.now ?? new Date();
    const [rules, coupons] = await Promise.all([
      this.getEligibleRules(input.sellerId, now),
      this.getEligibleCoupons(input.sellerId, input.couponCode, now),
    ]);
    const couponUsage = await this.getCouponUsage(input.userId, coupons);

    const result = this.discountEngineService.evaluate({
      userId: input.userId,
      sellerId: input.sellerId,
      productId: input.productId,
      categoryId: input.categoryId,
      unitPrice: input.unitPrice,
      quantity: input.quantity,
      couponCode: input.couponCode,
      campaignRules: rules.map((rule) => ({
        id: rule.id,
        campaignId: rule.campaignId,
        discountType: rule.discountType,
        discountValue: Number(rule.discountValue),
        scopeType: rule.scopeType,
        scopeId: rule.scopeId,
        minAmount: rule.minAmount === null ? null : Number(rule.minAmount),
        minQuantity: rule.minQuantity,
        tiers: this.normalizeTiers(rule.tiers),
        startsAt: rule.campaign.startsAt,
        endsAt: rule.campaign.endsAt,
      })),
      coupons: coupons.map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        status: coupon.status,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        startsAt: coupon.startsAt,
        endsAt: coupon.endsAt,
        minAmount: coupon.minAmount === null ? null : Number(coupon.minAmount),
        maxUses: coupon.maxUses,
        perUserLimit: coupon.perUserLimit,
        scopeType: coupon.scopeType,
        scopeId: coupon.scopeId,
        totalRedemptions: couponUsage.totalByCoupon.get(coupon.id) ?? 0,
        userRedemptions: couponUsage.userByCoupon.get(coupon.id) ?? 0,
      })),
      now,
    });
    const finalDiscounted = result.finalAmount;
    return { ...result, finalDiscounted };
  }

  async recordCouponRedemption(input: {
    couponId: string;
    userId: string;
    orderId: string;
    discountAmount: number;
    currency: string;
  }) {
    const existing = await this.couponRedemptionRepo.findOne({
      where: { orderId: input.orderId },
    });
    if (existing) {
      throw new BadRequestException({
        code: RC.COUPON_ALREADY_USED,
        message: 'Bu siparişte zaten kupon kullanılmış',
      });
    }

    const redemption = this.couponRedemptionRepo.create(input);
    const saved = await this.couponRedemptionRepo.save(redemption);
    return {
      code: RC.COUPON_APPLIED,
      message: 'Kupon siparişe uygulandı',
      redemption: saved,
    };
  }

  async pauseActiveCampaignsForSeller(sellerId: string, reason: string) {
    const [campaigns, coupons] = await Promise.all([
      this.campaignRepo.find({
        where: [
          { sellerId, status: CampaignStatus.ACTIVE },
          {
            sellerId: IsNull(),
            isPlatform: true,
            status: CampaignStatus.ACTIVE,
            requiresSellerOptIn: true,
          },
        ],
      }),
      this.couponRepo.find({
        where: { sellerId, status: CouponStatus.ACTIVE },
      }),
    ]);
    const pausedAt = new Date().toISOString();

    for (const campaign of campaigns) {
      const metadata = campaign.metadata ?? {};
      if (campaign.sellerId === sellerId) {
        campaign.metadata = {
          ...metadata,
          pausedByRestriction: reason,
          pausedAt,
        };
      } else {
        const optedInSellerIds = this.getStringArray(metadata.optedInSellerIds);
        const pausedSellerIds = this.getStringArray(metadata.pausedSellerIds);
        campaign.metadata = {
          ...metadata,
          optedInSellerIds: optedInSellerIds.filter((id) => id !== sellerId),
          pausedSellerIds: pausedSellerIds.includes(sellerId)
            ? pausedSellerIds
            : [...pausedSellerIds, sellerId],
          pausedAt,
          pausedByRestriction: reason,
        };
      }
      await this.campaignRepo.save(campaign);
    }

    for (const coupon of coupons) {
      coupon.metadata = {
        ...(coupon.metadata ?? {}),
        pausedByRestriction: reason,
        pausedAt,
      };
      await this.couponRepo.save(coupon);
    }

    return {
      code: RC.SUCCESS,
      message: 'Aktif kampanya ve kuponlar güven kısıtlaması nedeniyle durduruldu',
      pausedCampaignCount: campaigns.length,
      pausedCouponCount: coupons.length,
    };
  }

  private async getEligibleRules(sellerId: string, now: Date) {
    const rules = await this.campaignRuleRepo.find({
      where: [
        {
          campaign: {
            sellerId,
            status: CampaignStatus.ACTIVE,
            startsAt: LessThanOrEqual(now),
            endsAt: MoreThanOrEqual(now),
          },
        },
        {
          campaign: {
            sellerId: IsNull(),
            status: CampaignStatus.ACTIVE,
            isPlatform: true,
            startsAt: LessThanOrEqual(now),
            endsAt: MoreThanOrEqual(now),
          },
        },
      ],
      relations: ['campaign'],
    });
    return rules.filter(
      (rule) => !this.isCampaignPausedForSeller(rule.campaign, sellerId),
    );
  }

  private async getEligibleCoupons(
    sellerId: string,
    couponCode: string | undefined,
    now: Date,
  ) {
    if (!couponCode) return [];
    const coupons = await this.couponRepo.find({
      where: [
        {
          sellerId,
          code: couponCode.trim().toUpperCase(),
          status: CouponStatus.ACTIVE,
          startsAt: LessThanOrEqual(now),
          endsAt: MoreThanOrEqual(now),
        },
        {
          sellerId: IsNull(),
          code: couponCode.trim().toUpperCase(),
          status: CouponStatus.ACTIVE,
          startsAt: LessThanOrEqual(now),
          endsAt: MoreThanOrEqual(now),
        },
      ],
    });
    return coupons.filter((coupon) => !coupon.metadata?.pausedByRestriction);
  }

  private async assertAdsCampaignsAllowed(sellerId: string | null) {
    if (!sellerId || !this.trustService) return;
    try {
      await this.trustService.assertAllowed(sellerId, 'ADS_CAMPAIGNS');
    } catch (error) {
      await this.pauseActiveCampaignsForSeller(sellerId, 'ADS_CAMPAIGNS_LOCK');
      throw error;
    }
  }

  private isCampaignPausedForSeller(campaign: Campaign, sellerId: string) {
    if (campaign.metadata?.pausedByRestriction && campaign.sellerId === sellerId) {
      return true;
    }
    return this.getStringArray(campaign.metadata?.pausedSellerIds).includes(
      sellerId,
    );
  }

  private async getCouponUsage(userId: string, coupons: Coupon[]) {
    const totalByCoupon = new Map<string, number>();
    const userByCoupon = new Map<string, number>();
    await Promise.all(
      coupons.map(async (coupon) => {
        const [total, userTotal] = await Promise.all([
          this.couponRedemptionRepo.count({ where: { couponId: coupon.id } }),
          this.couponRedemptionRepo.count({ where: { couponId: coupon.id, userId } }),
        ]);
        totalByCoupon.set(coupon.id, total);
        userByCoupon.set(coupon.id, userTotal);
      }),
    );
    return { totalByCoupon, userByCoupon };
  }

  private async findCouponOrFail(id: string) {
    const coupon = await this.couponRepo.findOne({
      where: { id },
    });
    if (!coupon) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Kupon bulunamadı',
      });
    }
    return coupon;
  }

  private async assertSellerOwnsScopes(
    sellerId: string | null,
    rules: Array<{
      scopeType: CampaignScopeType;
      scopeId: string;
      discountType: CampaignDiscountType;
      discountValue: number;
    }>,
  ) {
    if (!sellerId) return;
    await Promise.all(
      rules.map(async (rule) => {
        if (rule.scopeType !== CampaignScopeType.PRODUCT) return;
        const product = await this.productRepo.findOne({
          where: { id: rule.scopeId },
        });
        if (!product || product.sellerId !== sellerId) {
          throw new ForbiddenException({
            code: RC.NOT_PRODUCT_OWNER,
            message: 'Kampanya hedef ürünü satıcıya ait değil',
          });
        }
      }),
    );
  }

  private resolveInitialCampaignStatus(startsAt: string, endsAt: string) {
    const now = Date.now();
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    if (end < now) return CampaignStatus.EXPIRED;
    if (start > now) return CampaignStatus.SCHEDULED;
    return CampaignStatus.ACTIVE;
  }

  private normalizeTiers(tiers: Array<Record<string, unknown>>) {
    return tiers.map((tier) => ({
      minAmount: typeof tier.minAmount === 'number' ? tier.minAmount : undefined,
      minQuantity:
        typeof tier.minQuantity === 'number' ? tier.minQuantity : undefined,
      discountType:
        typeof tier.discountType === 'string'
          ? (tier.discountType as CampaignDiscountType)
          : undefined,
      discountValue:
        typeof tier.discountValue === 'number' ? tier.discountValue : 0,
    }));
  }

  private getStringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}
