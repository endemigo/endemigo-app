import { ForbiddenException } from '@nestjs/common';
import {
  AdminAuditAction,
  AdminRole,
  RC,
  RestrictionStatus,
  RestrictionType,
  TrustBadgeLevel,
} from '@endemigo/shared';
import { TrustFlagReviewDecision } from './dto/review-trust-flag.dto';
import { TrustFlagStatus, TrustFlagType } from './entities/trust-flag.entity';
import { TrustService } from './trust.service';

describe('TrustService', () => {
  let trustScoreRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let trustFlagRepo: {
    findOne: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let restrictionRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let orderRepo: { count: jest.Mock };
  let paymentQueryBuilder: {
    innerJoin: jest.Mock;
    select: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    setParameter: jest.Mock;
    getRawOne: jest.Mock;
  };
  let paymentRepo: { createQueryBuilder: jest.Mock };
  let adminAuditService: { recordAction: jest.Mock };
  let service: TrustService;

  const actor = {
    id: 'admin-1',
    roles: [AdminRole.SUPER_ADMIN],
  };

  beforeEach(() => {
    trustScoreRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => ({ id: 'trust-score-1', ...value })),
      save: jest.fn((value) =>
        Promise.resolve({ id: value.id ?? 'trust-score-1', ...value }),
      ),
    };
    trustFlagRepo = {
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((value) => ({ id: 'flag-1', ...value })),
      save: jest.fn((value) =>
        Promise.resolve({ id: value.id ?? 'flag-1', ...value }),
      ),
    };
    restrictionRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((value) => ({ id: 'restriction-1', ...value })),
      save: jest.fn((value) =>
        Promise.resolve({ id: value.id ?? 'restriction-1', ...value }),
      ),
    };
    orderRepo = {
      count: jest.fn().mockResolvedValue(0),
    };
    paymentQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: 0, successful: 0 }),
    };
    paymentRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(paymentQueryBuilder),
    };
    adminAuditService = {
      recordAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };
    service = new TrustService(
      trustScoreRepo as never,
      trustFlagRepo as never,
      restrictionRepo as never,
      orderRepo as never,
      paymentRepo as never,
      adminAuditService as never,
    );
  });

  it('maps strong completion and payment behavior to HIGHLY_TRUSTED', async () => {
    orderRepo.count.mockResolvedValueOnce(10).mockResolvedValueOnce(9);
    paymentQueryBuilder.getRawOne.mockResolvedValue({
      total: '10',
      successful: '10',
    });

    const result = await service.recalculateSellerTrust('seller-1');

    expect(result.code).toBe(RC.TRUST_SCORE_UPDATED);
    expect(result.trustScore.score).toBe(95);
    expect(result.trustScore.badgeLevel).toBe(TrustBadgeLevel.HIGHLY_TRUSTED);
  });

  it('penalizes weak payment behavior deterministically', async () => {
    orderRepo.count.mockResolvedValueOnce(10).mockResolvedValueOnce(10);
    paymentQueryBuilder.getRawOne.mockResolvedValue({
      total: '10',
      successful: '2',
    });

    const result = await service.recalculateSellerTrust('seller-1');

    expect(result.trustScore.paymentReliabilityScore).toBe(0.2);
    expect(result.trustScore.score).toBe(76);
    expect(result.trustScore.badgeLevel).toBe(TrustBadgeLevel.TRUSTED);
  });

  it('forces RESTRICTED badge when active selling restriction exists', async () => {
    orderRepo.count.mockResolvedValueOnce(10).mockResolvedValueOnce(10);
    paymentQueryBuilder.getRawOne.mockResolvedValue({
      total: '10',
      successful: '10',
    });
    restrictionRepo.find.mockResolvedValue([
      {
        id: 'restriction-1',
        sellerId: 'seller-1',
        status: RestrictionStatus.ACTIVE,
        restrictionType: RestrictionType.SELLING_RESTRICTED,
      },
    ]);

    const result = await service.recalculateSellerTrust('seller-1');

    expect(result.trustScore.badgeLevel).toBe(TrustBadgeLevel.RESTRICTED);
  });

  it('maps poor completion and payment behavior to NEW', async () => {
    orderRepo.count.mockResolvedValueOnce(10).mockResolvedValueOnce(1);
    paymentQueryBuilder.getRawOne.mockResolvedValue({
      total: '10',
      successful: '0',
    });

    const result = await service.recalculateSellerTrust('seller-1');

    expect(result.trustScore.badgeLevel).toBe(TrustBadgeLevel.NEW);
  });

  it('reviews a flag, applies ADS_CAMPAIGNS_LOCK, and audits actions', async () => {
    trustFlagRepo.findOne.mockResolvedValue({
      id: 'flag-1',
      targetUserId: 'user-1',
      sellerId: 'seller-1',
      flagType: TrustFlagType.PAYMENT,
      severity: 4,
      status: TrustFlagStatus.PENDING_REVIEW,
      evidence: { orderId: 'order-1' },
    });
    orderRepo.count.mockResolvedValueOnce(0);
    paymentQueryBuilder.getRawOne.mockResolvedValue({
      total: '0',
      successful: '0',
    });

    const result = await service.reviewFlag(
      'flag-1',
      {
        decision: TrustFlagReviewDecision.RESOLVE,
        reason: 'Repeated risky payment behavior',
        restrictionType: RestrictionType.ADS_CAMPAIGNS_LOCK,
      },
      actor,
    );

    expect(result.code).toBe(RC.TRUST_REVIEWED);
    expect(result.restriction?.restrictionType).toBe(
      RestrictionType.ADS_CAMPAIGNS_LOCK,
    );
    expect(adminAuditService.recordAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: AdminAuditAction.USER_RESTRICTED }),
    );
  });

  it('blocks ADS_CAMPAIGNS capability when a matching restriction is active', async () => {
    restrictionRepo.find.mockResolvedValue([
      {
        id: 'restriction-1',
        sellerId: 'seller-1',
        status: RestrictionStatus.ACTIVE,
        restrictionType: RestrictionType.ADS_CAMPAIGNS_LOCK,
      },
    ]);

    await expect(
      service.assertAllowed('seller-1', 'ADS_CAMPAIGNS'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
