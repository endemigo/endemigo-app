import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdminAuditAction,
  AdminRole,
  OrderStatus,
  PaymentStatus,
  RC,
  RestrictionStatus,
  RestrictionType,
  TrustBadgeLevel,
} from '@endemigo/shared';
import { In, IsNull, MoreThan, Repository } from 'typeorm';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { Order } from '../order/entities/order.entity';
import { Payment } from '../payment/entities/payment.entity';
import { ApplyAccountRestrictionDto } from './dto/review-trust-flag.dto';
import { CreateTrustFlagDto } from './dto/create-trust-flag.dto';
import {
  ReviewTrustFlagDto,
  TrustFlagReviewDecision,
} from './dto/review-trust-flag.dto';
import { AccountRestriction } from './entities/account-restriction.entity';
import { TrustFlag, TrustFlagStatus } from './entities/trust-flag.entity';
import { TrustScore } from './entities/trust-score.entity';

const UNKNOWN_HISTORY_RATE = 0.4;

export type TrustCapability =
  | 'SELLING'
  | 'ADS_CAMPAIGNS'
  | 'PAYOUT'
  | 'MEMBERSHIP_BENEFIT';

export interface TrustBadge {
  level: TrustBadgeLevel;
  labelKey: string;
}

export interface TrustAdminActor {
  id: string;
  roles: AdminRole[];
}

@Injectable()
export class TrustService {
  constructor(
    @InjectRepository(TrustScore)
    private readonly trustScoreRepo: Repository<TrustScore>,
    @InjectRepository(TrustFlag)
    private readonly trustFlagRepo: Repository<TrustFlag>,
    @InjectRepository(AccountRestriction)
    private readonly restrictionRepo: Repository<AccountRestriction>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  async recalculateSellerTrust(sellerId: string) {
    const transactionCompletionRate =
      await this.getTransactionCompletionRate(sellerId);
    const paymentReliabilityScore =
      await this.getPaymentReliabilityScore(sellerId);
    const activeRestrictions = await this.getActiveRestrictions(sellerId);
    const pendingFlagCount = await this.countPendingFlags(sellerId);
    const riskRate = Math.max(
      0,
      1 - activeRestrictions.length * 0.5 - pendingFlagCount * 0.15,
    );
    const score = Math.round(
      transactionCompletionRate * 50 +
        paymentReliabilityScore * 30 +
        riskRate * 20,
    );
    const badgeLevel = this.resolveBadgeLevel(score, activeRestrictions);
    const existing = await this.trustScoreRepo.findOne({ where: { sellerId } });
    const trustScore =
      existing ??
      this.trustScoreRepo.create({
        sellerId,
      });

    Object.assign(trustScore, {
      score,
      badgeLevel,
      transactionCompletionRate,
      paymentReliabilityScore,
      restrictionCount: activeRestrictions.length,
      lastCalculatedAt: new Date(),
    });

    const saved = await this.trustScoreRepo.save(trustScore);
    return {
      code: RC.TRUST_SCORE_UPDATED,
      message: 'Trust skoru güncellendi',
      trustScore: saved,
      trustBadge: this.toBadge(saved.badgeLevel),
    };
  }

  async createFlag(dto: CreateTrustFlagDto, actor: TrustAdminActor) {
    const flag = this.trustFlagRepo.create({
      targetUserId: dto.targetUserId,
      sellerId: dto.sellerId ?? null,
      flagType: dto.flagType,
      severity: dto.severity,
      status: TrustFlagStatus.PENDING_REVIEW,
      evidence: dto.evidence,
      reviewReason: null,
      reviewedAt: null,
    });
    const saved = await this.trustFlagRepo.save(flag);

    await this.adminAuditService.recordAction({
      actorAdminId: actor.id,
      actorRoles: actor.roles,
      action: AdminAuditAction.TRUST_REVIEWED,
      targetType: 'trust_flag',
      targetId: saved.id,
      reason: dto.reason,
      after: saved as unknown as Record<string, unknown>,
    });

    if (saved.sellerId) {
      await this.recalculateSellerTrust(saved.sellerId);
    }

    return {
      code: RC.TRUST_FLAG_CREATED,
      message: 'Trust inceleme işareti oluşturuldu',
      flag: saved,
    };
  }

  async reviewFlag(
    id: string,
    dto: ReviewTrustFlagDto,
    actor: TrustAdminActor,
  ) {
    const flag = await this.trustFlagRepo.findOne({ where: { id } });
    if (!flag) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Trust işareti bulunamadı',
      });
    }

    const before = { ...flag };
    flag.status =
      dto.decision === TrustFlagReviewDecision.DISMISS
        ? TrustFlagStatus.DISMISSED
        : TrustFlagStatus.RESOLVED;
    flag.reviewReason = dto.reason;
    flag.reviewedAt = new Date();
    const saved = await this.trustFlagRepo.save(flag);

    await this.adminAuditService.recordAction({
      actorAdminId: actor.id,
      actorRoles: actor.roles,
      action: AdminAuditAction.TRUST_REVIEWED,
      targetType: 'trust_flag',
      targetId: saved.id,
      reason: dto.reason,
      before: before as unknown as Record<string, unknown>,
      after: saved as unknown as Record<string, unknown>,
    });

    let restriction: AccountRestriction | null = null;
    if (
      dto.decision === TrustFlagReviewDecision.RESOLVE &&
      dto.restrictionType
    ) {
      restriction = await this.applyRestrictionInternal(
        {
          targetUserId: saved.targetUserId,
          sellerId: saved.sellerId ?? undefined,
          restrictionType: dto.restrictionType,
          reason: dto.reason,
          endsAt: dto.endsAt,
          metadata: { sourceFlagId: saved.id },
        },
        actor,
      );
    } else if (saved.sellerId) {
      await this.recalculateSellerTrust(saved.sellerId);
    }

    return {
      code: RC.TRUST_REVIEWED,
      message: 'Trust incelemesi tamamlandı',
      flag: saved,
      restriction,
    };
  }

  async applyRestriction(dto: ApplyAccountRestrictionDto, actor: TrustAdminActor) {
    const restriction = await this.applyRestrictionInternal(dto, actor);
    return {
      code: RC.RESTRICTION_APPLIED,
      message: 'Kısıtlama uygulandı',
      restriction,
    };
  }

  async resolveRestriction(id: string, reason: string, actor: TrustAdminActor) {
    if (!reason?.trim()) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Kısıtlama çözümü için sebep zorunludur',
      });
    }
    const restriction = await this.restrictionRepo.findOne({ where: { id } });
    if (!restriction) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Kısıtlama bulunamadı',
      });
    }
    const before = { ...restriction };
    restriction.status = RestrictionStatus.RESOLVED;
    restriction.metadata = {
      ...(restriction.metadata ?? {}),
      resolvedReason: reason,
      resolvedAt: new Date().toISOString(),
    };
    const saved = await this.restrictionRepo.save(restriction);

    await this.adminAuditService.recordAction({
      actorAdminId: actor.id,
      actorRoles: actor.roles,
      action: AdminAuditAction.TRUST_REVIEWED,
      targetType: 'account_restriction',
      targetId: saved.id,
      reason,
      before: before as unknown as Record<string, unknown>,
      after: saved as unknown as Record<string, unknown>,
    });

    if (saved.sellerId) {
      await this.recalculateSellerTrust(saved.sellerId);
    }

    return {
      code: RC.RESTRICTION_RESOLVED,
      message: 'Kısıtlama çözüldü',
      restriction: saved,
    };
  }

  async assertAllowed(targetId: string, capability: TrustCapability) {
    const restrictionTypes = this.restrictionTypesForCapability(capability);
    const restrictions = await this.getActiveRestrictions(
      targetId,
      restrictionTypes,
    );
    if (restrictions.length > 0) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Bu işlem güven kısıtlaması nedeniyle engellendi',
        capability,
        restrictionType: restrictions[0].restrictionType,
      });
    }
    return {
      code: RC.SUCCESS,
      message: 'İşlem için güven kısıtlaması yok',
      allowed: true,
      capability,
    };
  }

  async getSellerTrustBadge(sellerId: string): Promise<TrustBadge> {
    const activeSellingRestrictions = await this.getActiveRestrictions(
      sellerId,
      [RestrictionType.SELLING_RESTRICTED, RestrictionType.ACCOUNT_SUSPENDED],
    );
    if (activeSellingRestrictions.length > 0) {
      return this.toBadge(TrustBadgeLevel.RESTRICTED);
    }

    let trustScore = await this.trustScoreRepo.findOne({ where: { sellerId } });
    if (!trustScore) {
      const recalculated = await this.recalculateSellerTrust(sellerId);
      trustScore = recalculated.trustScore;
    }
    return this.toBadge(trustScore.badgeLevel);
  }

  private async applyRestrictionInternal(
    dto: ApplyAccountRestrictionDto,
    actor: TrustAdminActor,
  ) {
    const restriction = this.restrictionRepo.create({
      targetUserId: dto.targetUserId,
      sellerId: dto.sellerId ?? null,
      restrictionType: dto.restrictionType,
      status: RestrictionStatus.ACTIVE,
      reason: dto.reason,
      startsAt: new Date(),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      metadata: dto.metadata ?? {},
    });
    const saved = await this.restrictionRepo.save(restriction);

    await this.adminAuditService.recordAction({
      actorAdminId: actor.id,
      actorRoles: actor.roles,
      action: AdminAuditAction.USER_RESTRICTED,
      targetType: 'account_restriction',
      targetId: saved.id,
      reason: dto.reason,
      after: saved as unknown as Record<string, unknown>,
    });

    if (saved.sellerId) {
      await this.recalculateSellerTrust(saved.sellerId);
    }

    return saved;
  }

  private async getTransactionCompletionRate(sellerId: string) {
    const total = await this.orderRepo.count({ where: { sellerId } });
    if (total === 0) return UNKNOWN_HISTORY_RATE;

    const completed = await this.orderRepo.count({
      where: {
        sellerId,
        status: In([OrderStatus.COMPLETED, OrderStatus.DELIVERED]),
      },
    });
    return this.toRate(completed, total);
  }

  private async getPaymentReliabilityScore(sellerId: string) {
    const raw = await this.paymentRepo
      .createQueryBuilder('payment')
      .innerJoin(Order, 'seller_order', 'seller_order.id = payment.orderId')
      .select('COUNT(payment.id)', 'total')
      .addSelect(
        'SUM(CASE WHEN payment.status IN (:...successfulStatuses) THEN 1 ELSE 0 END)',
        'successful',
      )
      .where('seller_order.sellerId = :sellerId', { sellerId })
      .setParameter('successfulStatuses', [
        PaymentStatus.AUTHORIZED,
        PaymentStatus.ESCROW_HELD,
      ])
      .getRawOne<{ total?: string | number; successful?: string | number }>();

    const total = Number(raw?.total ?? 0);
    if (total === 0) return UNKNOWN_HISTORY_RATE;
    return this.toRate(Number(raw?.successful ?? 0), total);
  }

  private async countPendingFlags(sellerId: string) {
    return this.trustFlagRepo.count({
      where: [
        { sellerId, status: TrustFlagStatus.PENDING_REVIEW },
        { targetUserId: sellerId, status: TrustFlagStatus.PENDING_REVIEW },
      ],
    });
  }

  private async getActiveRestrictions(
    targetId: string,
    restrictionTypes?: RestrictionType[],
  ) {
    const now = new Date();
    const typeWhere =
      restrictionTypes && restrictionTypes.length > 0
        ? { restrictionType: In(restrictionTypes) }
        : {};
    return this.restrictionRepo.find({
      where: [
        {
          targetUserId: targetId,
          status: RestrictionStatus.ACTIVE,
          endsAt: IsNull(),
          ...typeWhere,
        },
        {
          targetUserId: targetId,
          status: RestrictionStatus.ACTIVE,
          endsAt: MoreThan(now),
          ...typeWhere,
        },
        {
          sellerId: targetId,
          status: RestrictionStatus.ACTIVE,
          endsAt: IsNull(),
          ...typeWhere,
        },
        {
          sellerId: targetId,
          status: RestrictionStatus.ACTIVE,
          endsAt: MoreThan(now),
          ...typeWhere,
        },
      ],
    });
  }

  private restrictionTypesForCapability(capability: TrustCapability) {
    const map: Record<TrustCapability, RestrictionType[]> = {
      SELLING: [
        RestrictionType.SELLING_RESTRICTED,
        RestrictionType.ACCOUNT_SUSPENDED,
      ],
      ADS_CAMPAIGNS: [
        RestrictionType.ADS_CAMPAIGNS_LOCK,
        RestrictionType.SELLING_RESTRICTED,
        RestrictionType.ACCOUNT_SUSPENDED,
      ],
      PAYOUT: [
        RestrictionType.PAYOUT_MANUAL_REVIEW,
        RestrictionType.ACCOUNT_SUSPENDED,
      ],
      MEMBERSHIP_BENEFIT: [
        RestrictionType.MEMBERSHIP_CANCELLED,
        RestrictionType.ACCOUNT_SUSPENDED,
      ],
    };
    return map[capability];
  }

  private resolveBadgeLevel(
    score: number,
    activeRestrictions: AccountRestriction[],
  ) {
    const hardRestricted = activeRestrictions.some((restriction) =>
      [
        RestrictionType.SELLING_RESTRICTED,
        RestrictionType.ACCOUNT_SUSPENDED,
      ].includes(restriction.restrictionType),
    );
    if (hardRestricted) return TrustBadgeLevel.RESTRICTED;
    if (score >= 85) return TrustBadgeLevel.HIGHLY_TRUSTED;
    if (score >= 60) return TrustBadgeLevel.TRUSTED;
    return TrustBadgeLevel.NEW;
  }

  private toBadge(level: TrustBadgeLevel): TrustBadge {
    return {
      level,
      labelKey: `trust.badge.${level.toLowerCase()}`,
    };
  }

  private toRate(part: number, total: number) {
    return total > 0 ? Number((part / total).toFixed(2)) : UNKNOWN_HISTORY_RATE;
  }
}
