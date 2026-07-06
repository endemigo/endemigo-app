import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdPlacementType,
  AdRequestStatus,
  AdminAuditAction,
  AdminRole,
  AdminSettingKey,
  RC,
} from '@endemigo/shared';
import { ProductStatus } from '../../shared/types/product-status.enum';
import { Product } from '../product/entities/product.entity';
import { WalletService } from '../wallet/wallet.service';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';
import {
  MembershipBenefits,
  MembershipService,
} from '../membership/membership.service';
import { TrustService } from '../trust/trust.service';
import { CreateAdRequestDto } from './dto/create-ad-request.dto';
import { AdSlotQueryDto } from './dto/ad-slot-query.dto';
import { ReviewAdRequestDto } from './dto/review-ad-request.dto';
import { AdPackage } from './entities/ad-package.entity';
import { AdPlacement } from './entities/ad-placement.entity';
import { AdRequest } from './entities/ad-request.entity';

interface AdminActor {
  id: string;
  roles: AdminRole[];
}

interface SponsoredProductLike {
  id: string;
  categoryId?: string | null;
}

export interface SponsoredMetadata {
  isSponsored: boolean;
  sponsoredLabel?: 'Sponsorlu';
  adRequestId?: string;
  placementType?: AdPlacementType;
  visibilityBoost?: number;
}

@Injectable()
export class AdsService {
  constructor(
    @InjectRepository(AdPackage)
    private readonly adPackageRepo: Repository<AdPackage>,
    @InjectRepository(AdRequest)
    private readonly adRequestRepo: Repository<AdRequest>,
    @InjectRepository(AdPlacement)
    private readonly adPlacementRepo: Repository<AdPlacement>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly walletService: WalletService,
    private readonly adminAuditService: AdminAuditService,
    @Optional()
    private readonly adminSettingsService?: AdminSettingsService,
    @Optional()
    private readonly membershipService?: MembershipService,
    @Optional()
    private readonly trustService?: TrustService,
  ) {}

  async listPackages() {
    const packages = await this.ensureDefaultPackages();
    return {
      code: RC.SUCCESS,
      message: 'Reklam paketleri getirildi',
      items: packages,
    };
  }

  async createRequest(sellerId: string, dto: CreateAdRequestDto) {
    const existing = await this.adRequestRepo.findOne({
      where: { sellerId, idempotencyKey: dto.idempotencyKey },
      relations: ['adPackage', 'placements'],
    });
    if (existing) {
      return {
        code: RC.AD_REQUEST_CREATED,
        message: 'Reklam talebi zaten oluşturulmuş',
        adRequest: existing,
      };
    }

    await this.assertAdsCampaignsAllowed(sellerId);
    const adPackage = await this.findActivePackage(dto.packageId);
    const product = dto.productId
      ? await this.findSellerProduct(sellerId, dto.productId)
      : null;
    const baseAmount = Number(adPackage.price);
    const benefits = await this.membershipService?.getSellerBenefits(sellerId);
    const charge = this.calculateAdCharge(baseAmount, benefits);
    const holdReference = this.getHoldReference(sellerId, dto.idempotencyKey);
    const hold = await this.walletService.createHold(
      holdReference,
      sellerId,
      charge.reservedAmount,
    );

    const adRequest = this.adRequestRepo.create({
      sellerId,
      productId: product?.id ?? null,
      packageId: adPackage.id,
      adPackage,
      placementType: adPackage.placementType,
      status: AdRequestStatus.ADMIN_REVIEW,
      amount: charge.reservedAmount,
      currency: adPackage.currency,
      walletHoldId: hold.id,
      reviewReason: null,
      approvedAt: null,
      rejectedAt: null,
      publishedAt: null,
      startsAt: null,
      endsAt: null,
      idempotencyKey: dto.idempotencyKey,
      metadata: {
        categoryId: dto.categoryId ?? product?.categoryId ?? null,
        slotKey: dto.slotKey ?? null,
        membershipBenefitApplied: Boolean(benefits),
        baseAmount,
        adCreditsApplied: charge.adCreditsApplied,
        adDiscountRate: charge.adDiscountRate,
        reservedAmount: charge.reservedAmount,
      },
    });

    const saved = await this.adRequestRepo.save(adRequest);
    return {
      code: RC.AD_FUNDS_RESERVED,
      message: 'Reklam talebi oluşturuldu ve bakiye rezerve edildi',
      adRequest: saved,
    };
  }

  async listMyRequests(sellerId: string) {
    const items = await this.adRequestRepo.find({
      where: { sellerId },
      relations: ['adPackage', 'placements'],
      order: { createdAt: 'DESC' },
    });
    return {
      code: RC.SUCCESS,
      message: 'Reklam talepleriniz getirildi',
      items,
    };
  }

  async listAdminRequests(page = 1, limit = 25) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const [items, total] = await this.adRequestRepo.findAndCount({
      relations: ['adPackage', 'placements'],
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return {
      code: RC.SUCCESS,
      message: 'Admin reklam talepleri getirildi',
      resource: 'ads',
      items,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
      },
    };
  }

  async approveRequest(id: string, dto: ReviewAdRequestDto, actor: AdminActor) {
    const adRequest = await this.findRequestOrFail(id);
    if (adRequest.status !== AdRequestStatus.ADMIN_REVIEW) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Sadece admin incelemesindeki reklamlar onaylanabilir',
      });
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const endsAt = dto.endsAt
      ? new Date(dto.endsAt)
      : this.addDays(startsAt, adRequest.adPackage.durationDays);
    const before = this.toRecord(adRequest);
    const categoryId = dto.categoryId ?? this.getMetadataString(adRequest, 'categoryId');
    const slotKey = dto.slotKey ?? this.getMetadataString(adRequest, 'slotKey');

    await this.assertSlotAvailable({
      placementType: adRequest.placementType,
      categoryId,
      slotKey,
      startsAt,
      endsAt,
      excludeAdRequestId: adRequest.id,
    });

    adRequest.status =
      startsAt.getTime() > Date.now()
        ? AdRequestStatus.SCHEDULED
        : AdRequestStatus.APPROVED;
    adRequest.reviewReason = dto.reason;
    adRequest.approvedAt = new Date();
    adRequest.startsAt = startsAt;
    adRequest.endsAt = endsAt;
    const saved = await this.adRequestRepo.save(adRequest);

    const placement = this.adPlacementRepo.create({
      adRequestId: saved.id,
      adRequest: saved,
      placementType: saved.placementType,
      categoryId,
      slotKey,
      startsAt,
      endsAt,
      isActive: false,
      impressions: 0,
      clicks: 0,
    });
    await this.adPlacementRepo.save(placement);

    await this.adminAuditService.recordAction({
      actorAdminId: actor.id,
      actorRoles: actor.roles,
      action: AdminAuditAction.AD_APPROVED,
      targetType: 'AD_REQUEST',
      targetId: saved.id,
      reason: dto.reason,
      before,
      after: this.toRecord(saved),
      metadata: { placementId: placement.id },
    });

    return {
      code: RC.AD_APPROVED,
      message: 'Reklam talebi onaylandı',
      adRequest: saved,
      placement,
    };
  }

  async publishApprovedRequest(id: string) {
    const adRequest = await this.findRequestOrFail(id);
    if (adRequest.status === AdRequestStatus.ACTIVE) {
      return {
        code: RC.AD_PUBLISHED,
        message: 'Reklam zaten yayında',
        adRequest,
      };
    }

    if (
      adRequest.status !== AdRequestStatus.APPROVED &&
      adRequest.status !== AdRequestStatus.SCHEDULED
    ) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Sadece onaylı veya planlı reklam yayınlanabilir',
      });
    }

    await this.assertAdsCampaignsAllowed(adRequest.sellerId);
    await this.walletService.captureHold(
      this.getHoldReference(adRequest.sellerId, adRequest.idempotencyKey),
      adRequest.sellerId,
    );

    const startsAt = adRequest.startsAt ?? new Date();
    const endsAt =
      adRequest.endsAt ?? this.addDays(startsAt, adRequest.adPackage.durationDays);
    adRequest.status = AdRequestStatus.ACTIVE;
    adRequest.publishedAt = new Date();
    adRequest.startsAt = startsAt;
    adRequest.endsAt = endsAt;
    const saved = await this.adRequestRepo.save(adRequest);

    await this.adPlacementRepo.update(
      { adRequestId: saved.id },
      { isActive: true, startsAt, endsAt },
    );

    return {
      code: RC.AD_PUBLISHED,
      message: 'Reklam yayına alındı',
      adRequest: saved,
    };
  }

  async rejectRequest(id: string, dto: ReviewAdRequestDto, actor: AdminActor) {
    const adRequest = await this.findRequestOrFail(id);
    if (
      adRequest.status === AdRequestStatus.ACTIVE ||
      adRequest.status === AdRequestStatus.REJECTED ||
      adRequest.status === AdRequestStatus.CANCELLED
    ) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Bu reklam talebi reddedilemez',
      });
    }

    const before = this.toRecord(adRequest);
    await this.walletService.releaseHold(
      this.getHoldReference(adRequest.sellerId, adRequest.idempotencyKey),
      adRequest.sellerId,
    );

    adRequest.status = AdRequestStatus.REJECTED;
    adRequest.reviewReason = dto.reason;
    adRequest.rejectedAt = new Date();
    const saved = await this.adRequestRepo.save(adRequest);

    await this.adminAuditService.recordAction({
      actorAdminId: actor.id,
      actorRoles: actor.roles,
      action: AdminAuditAction.AD_REJECTED,
      targetType: 'AD_REQUEST',
      targetId: saved.id,
      reason: dto.reason,
      before,
      after: this.toRecord(saved),
    });

    return {
      code: RC.AD_REJECTED,
      message: 'Reklam talebi reddedildi ve rezervasyon çözüldü',
      adRequest: saved,
    };
  }

  async cancelBeforePublish(id: string, sellerId: string, reason: string) {
    const adRequest = await this.findRequestOrFail(id);
    if (adRequest.sellerId !== sellerId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Bu reklam talebi size ait değil',
      });
    }
    if (adRequest.status === AdRequestStatus.ACTIVE || adRequest.publishedAt) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Yayındaki reklam iptal edilemez',
      });
    }

    await this.walletService.releaseHold(
      this.getHoldReference(adRequest.sellerId, adRequest.idempotencyKey),
      adRequest.sellerId,
    );
    adRequest.status = AdRequestStatus.CANCELLED;
    adRequest.reviewReason = reason;
    const saved = await this.adRequestRepo.save(adRequest);
    return {
      code: RC.AD_CANCELLED,
      message: 'Reklam talebi iptal edildi ve rezervasyon çözüldü',
      adRequest: saved,
    };
  }

  async annotateSponsoredProducts<T extends SponsoredProductLike>(
    products: T[],
    placementType: AdPlacementType,
    categoryId?: string,
  ): Promise<Array<T & SponsoredMetadata>> {
    if (products.length === 0) return [];

    const placements = await this.getActiveSponsoredPlacements(placementType, {
      categoryId,
      limit: products.length,
    });
    const visibilityBoosts = await this.getVisibilityBoosts(
      placements
        .map((placement) => placement.adRequest.sellerId)
        .filter((sellerId): sellerId is string => !!sellerId),
    );
    const metadataByProductId = new Map<string, SponsoredMetadata>();
    for (const placement of placements) {
      const productId = placement.adRequest.productId;
      if (!productId) continue;
      metadataByProductId.set(productId, {
        isSponsored: true,
        sponsoredLabel: 'Sponsorlu',
        adRequestId: placement.adRequestId,
        placementType: placement.placementType,
        visibilityBoost:
          visibilityBoosts.get(placement.adRequest.sellerId) ?? 0,
      });
    }

    const annotated: Array<T & SponsoredMetadata & { __index: number }> =
      products.map((product, index) => ({
      ...product,
      __index: index,
      ...(metadataByProductId.get(product.id) ?? { isSponsored: false }),
    }));
    return annotated
      .sort((left, right) => {
        const leftScore =
          (left.isSponsored ? 1000 : 0) + (left.visibilityBoost ?? 0);
        const rightScore =
          (right.isSponsored ? 1000 : 0) + (right.visibilityBoost ?? 0);
        return rightScore - leftScore || left.__index - right.__index;
      })
      .map(({ __index: _index, ...product }) => product as T & SponsoredMetadata);
  }

  async pauseActivePlacementsForSeller(sellerId: string, reason: string) {
    const placements = await this.adPlacementRepo
      .createQueryBuilder('placement')
      .leftJoinAndSelect('placement.adRequest', 'adRequest')
      .where('adRequest.sellerId = :sellerId', { sellerId })
      .andWhere('placement.isActive = true')
      .andWhere('adRequest.status = :status', { status: AdRequestStatus.ACTIVE })
      .getMany();
    const pausedAt = new Date().toISOString();

    for (const placement of placements) {
      placement.isActive = false;
      placement.adRequest.metadata = {
        ...(placement.adRequest.metadata ?? {}),
        pausedByRestriction: reason,
        pausedAt,
      };
      await this.adPlacementRepo.save(placement);
      await this.adRequestRepo.save(placement.adRequest);
    }

    return {
      code: RC.SUCCESS,
      message: 'Aktif reklam yerleşimleri güven kısıtlaması nedeniyle durduruldu',
      pausedCount: placements.length,
    };
  }

  async getActiveSponsoredPlacements(
    placementType: AdPlacementType,
    options: { categoryId?: string; limit?: number; now?: Date } = {},
  ) {
    const now = options.now ?? new Date();
    const limit = Math.min(
      Math.max(options.limit ?? (await this.getSponsoredDensity()), 1),
      await this.getSponsoredDensity(),
    );

    const qb = this.adPlacementRepo
      .createQueryBuilder('placement')
      .leftJoinAndSelect('placement.adRequest', 'adRequest')
      .leftJoinAndSelect('adRequest.product', 'product')
      .where('placement.placementType = :placementType', { placementType })
      .andWhere('placement.isActive = true')
      .andWhere('placement.startsAt <= :now', { now })
      .andWhere('placement.endsAt >= :now', { now })
      .andWhere('adRequest.status = :status', { status: AdRequestStatus.ACTIVE })
      .orderBy('placement.startsAt', 'ASC')
      .take(limit);

    if (options.categoryId) {
      qb.andWhere('(placement.categoryId = :categoryId OR product.categoryId = :categoryId)', {
        categoryId: options.categoryId,
      });
    }

    return qb.getMany();
  }

  async getSlotCalendar(query: AdSlotQueryDto) {
    const from = this.parseSlotDate(query.from, 'from');
    const to = this.parseSlotDate(query.to, 'to');
    this.assertSlotRange(from, to);
    const [occupiedSlots, conflicts, density] = await Promise.all([
      this.findSlotPlacements({
        placementType: query.placementType,
        categoryId: query.categoryId,
        slotKey: query.slotKey,
        startsAt: from,
        endsAt: to,
      }),
      this.findSlotConflicts({
        placementType: query.placementType,
        categoryId: query.categoryId ?? null,
        slotKey: query.slotKey ?? null,
        startsAt: from,
        endsAt: to,
      }),
      this.getSponsoredDensity(),
    ]);

    return {
      code: RC.AD_SLOT_CALENDAR_FETCHED,
      message: 'Reklam slot takvimi getirildi',
      occupiedSlots,
      availableWindows:
        conflicts.length >= density ? [] : [{ startsAt: from, endsAt: to }],
      activeDensity: {
        maxSponsoredPerPage: density,
        occupiedCount: conflicts.length,
      },
      conflictingAdRequestIds: conflicts.map((placement) => placement.adRequestId),
    };
  }

  async getSlotConflicts(query: AdSlotQueryDto) {
    const from = this.parseSlotDate(query.from, 'from');
    const to = this.parseSlotDate(query.to, 'to');
    this.assertSlotRange(from, to);
    const conflicts = await this.findSlotConflicts({
      placementType: query.placementType,
      categoryId: query.categoryId ?? null,
      slotKey: query.slotKey ?? null,
      startsAt: from,
      endsAt: to,
    });

    return {
      code: RC.AD_SLOT_CONFLICTS_FETCHED,
      message: 'Reklam slot çakışmaları getirildi',
      conflicts,
      conflictingAdRequestIds: conflicts.map((placement) => placement.adRequestId),
    };
  }

  async assertSlotAvailable(input: {
    placementType: AdPlacementType;
    categoryId: string | null;
    slotKey: string | null;
    startsAt: Date;
    endsAt: Date;
    excludeAdRequestId?: string;
  }) {
    this.assertSlotRange(input.startsAt, input.endsAt);
    const [conflicts, density] = await Promise.all([
      this.findSlotConflicts(input),
      this.getSponsoredDensity(),
    ]);
    const sameSlotConflict = conflicts.some((placement) => {
      const sameSlot = (placement.slotKey ?? null) === (input.slotKey ?? null);
      const sameCategory =
        (placement.categoryId ?? null) === (input.categoryId ?? null);
      return sameSlot && sameCategory;
    });

    if (sameSlotConflict || conflicts.length >= density) {
      throw new BadRequestException({
        code: RC.AD_SLOT_CONFLICT,
        message: 'Reklam slotu seçilen zaman aralığında uygun değil',
        conflicts: conflicts.map((placement) => placement.adRequestId),
        density,
      });
    }
  }

  private findSlotPlacements(input: {
    placementType: AdPlacementType;
    categoryId?: string;
    slotKey?: string;
    startsAt: Date;
    endsAt: Date;
  }) {
    const qb = this.adPlacementRepo
      .createQueryBuilder('placement')
      .leftJoinAndSelect('placement.adRequest', 'adRequest')
      .where('placement.placementType = :placementType', {
        placementType: input.placementType,
      })
      .andWhere('placement.startsAt < :endsAt', { endsAt: input.endsAt })
      .andWhere('placement.endsAt > :startsAt', { startsAt: input.startsAt })
      .orderBy('placement.startsAt', 'ASC');

    if (input.categoryId) {
      qb.andWhere('placement.categoryId = :categoryId', {
        categoryId: input.categoryId,
      });
    }
    if (input.slotKey) {
      qb.andWhere('placement.slotKey = :slotKey', { slotKey: input.slotKey });
    }

    return qb.getMany();
  }

  private findSlotConflicts(input: {
    placementType: AdPlacementType;
    categoryId: string | null;
    slotKey: string | null;
    startsAt: Date;
    endsAt: Date;
    excludeAdRequestId?: string;
  }) {
    const qb = this.adPlacementRepo
      .createQueryBuilder('placement')
      .leftJoinAndSelect('placement.adRequest', 'adRequest')
      .where('placement.placementType = :placementType', {
        placementType: input.placementType,
      })
      .andWhere('placement.startsAt < :endsAt', { endsAt: input.endsAt })
      .andWhere('placement.endsAt > :startsAt', { startsAt: input.startsAt })
      .andWhere('adRequest.status IN (:...statuses)', {
        statuses: [
          AdRequestStatus.APPROVED,
          AdRequestStatus.SCHEDULED,
          AdRequestStatus.ACTIVE,
        ],
      });

    if (input.categoryId) {
      qb.andWhere('placement.categoryId = :categoryId', {
        categoryId: input.categoryId,
      });
    }
    if (input.slotKey) {
      qb.andWhere('placement.slotKey = :slotKey', { slotKey: input.slotKey });
    }
    if (input.excludeAdRequestId) {
      qb.andWhere('placement.adRequestId != :excludeAdRequestId', {
        excludeAdRequestId: input.excludeAdRequestId,
      });
    }

    return qb.getMany();
  }

  private async ensureDefaultPackages() {
    const existing = await this.adPackageRepo.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
    if (existing.length > 0) return existing;

    const defaults = this.adPackageRepo.create([
      {
        name: 'Search promotion',
        placementType: AdPlacementType.SEARCH_PROMOTION,
        price: 750,
        currency: 'TRY',
        durationDays: 7,
        isActive: true,
        metadata: {},
      },
      {
        name: 'Category showcase',
        placementType: AdPlacementType.CATEGORY_SHOWCASE,
        price: 1250,
        currency: 'TRY',
        durationDays: 7,
        isActive: true,
        metadata: {},
      },
      {
        name: 'Home banner',
        placementType: AdPlacementType.HOME_BANNER,
        price: 2500,
        currency: 'TRY',
        durationDays: 5,
        isActive: true,
        metadata: {},
      },
    ]);

    return this.adPackageRepo.save(defaults);
  }

  private async findActivePackage(id: string) {
    const adPackage = await this.adPackageRepo.findOne({
      where: { id, isActive: true },
    });
    if (!adPackage) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Reklam paketi bulunamadı',
      });
    }
    return adPackage;
  }

  private async findSellerProduct(sellerId: string, productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId, status: ProductStatus.ACTIVE },
      relations: ['category'],
    });
    if (!product) {
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Ürün bulunamadı veya aktif değil',
      });
    }
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException({
        code: RC.NOT_PRODUCT_OWNER,
        message: 'Bu ürün size ait değil',
      });
    }
    return product;
  }

  private async findRequestOrFail(id: string) {
    const adRequest = await this.adRequestRepo.findOne({
      where: { id },
      relations: ['adPackage', 'product', 'placements'],
    });
    if (!adRequest) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Reklam talebi bulunamadı',
      });
    }
    return adRequest;
  }

  private getHoldReference(sellerId: string, idempotencyKey: string) {
    return `ad-request:${sellerId}:${idempotencyKey}`;
  }

  private async assertAdsCampaignsAllowed(sellerId: string) {
    if (!this.trustService) return;
    try {
      await this.trustService.assertAllowed(sellerId, 'ADS_CAMPAIGNS');
    } catch (error) {
      await this.pauseActivePlacementsForSeller(sellerId, 'ADS_CAMPAIGNS_LOCK');
      throw error;
    }
  }

  private calculateAdCharge(
    baseAmount: number,
    benefits?: MembershipBenefits,
  ) {
    const adCreditsApplied = Math.min(
      Math.max(Number(benefits?.adCredits ?? 0), 0),
      baseAmount,
    );
    const adDiscountRate = Math.min(
      Math.max(Number(benefits?.adDiscountRate ?? 0), 0),
      1,
    );
    const discountedBase = Math.max(0, baseAmount - adCreditsApplied);
    const reservedAmount = Number(
      Math.max(0, discountedBase - discountedBase * adDiscountRate).toFixed(2),
    );
    return { reservedAmount, adCreditsApplied, adDiscountRate };
  }

  private async getVisibilityBoosts(sellerIds: string[]) {
    const boosts = new Map<string, number>();
    if (!this.membershipService || sellerIds.length === 0) return boosts;

    const benefitsBySeller =
      await this.membershipService.getBenefitsForSellers(sellerIds);
    for (const [sellerId, benefits] of benefitsBySeller) {
      boosts.set(sellerId, Math.max(0, Number(benefits?.visibilityBoost ?? 0)));
    }
    return boosts;
  }

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private parseSlotDate(value: string, field: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: `${field} geçerli bir tarih olmalı`,
      });
    }
    return date;
  }

  private assertSlotRange(startsAt: Date, endsAt: Date) {
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Slot bitiş zamanı başlangıçtan sonra olmalı',
      });
    }
    const maxRangeMs = 31 * 24 * 60 * 60 * 1000;
    if (endsAt.getTime() - startsAt.getTime() > maxRangeMs) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Slot takvimi en fazla 31 gün için sorgulanabilir',
      });
    }
  }

  private getMetadataString(adRequest: AdRequest, key: string): string | null {
    const value = adRequest.metadata?.[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private async getSponsoredDensity() {
    if (!this.adminSettingsService) return 3;

    const settings = await this.adminSettingsService.list();
    const density = settings.items.find(
      (item) => item.key === AdminSettingKey.AD_SPONSORED_DENSITY,
    );
    const maxSponsoredPerPage = density?.value?.maxSponsoredPerPage;
    return typeof maxSponsoredPerPage === 'number' ? maxSponsoredPerPage : 3;
  }

  private toRecord(entity: object): Record<string, unknown> {
    return { ...entity };
  }
}
