import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
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
import { MembershipService } from '../membership/membership.service';
import { TrustService } from '../trust/trust.service';
import { AdsService } from './ads.service';
import { AdPackage } from './entities/ad-package.entity';
import { AdPlacement } from './entities/ad-placement.entity';
import { AdRequest } from './entities/ad-request.entity';

function createPlacementQueryBuilder(results: Array<Record<string, unknown>>) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(results),
  };
}

describe('AdsService', () => {
  let service: AdsService;
  let adPackageRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let adRequestRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let adPlacementRepo: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let productRepo: {
    findOne: jest.Mock;
  };
  let walletService: {
    createHold: jest.Mock;
    releaseHold: jest.Mock;
    captureHold: jest.Mock;
  };
  let adminAuditService: {
    recordAction: jest.Mock;
  };
  let membershipService: {
    getSellerBenefits: jest.Mock;
    getBenefitsForSellers: jest.Mock;
  };
  let trustService: {
    assertAllowed: jest.Mock;
  };

  const actor = {
    id: 'admin-1',
    roles: [AdminRole.OPERATIONS],
  };
  const adPackage = {
    id: 'package-1',
    name: 'Search promotion',
    placementType: AdPlacementType.SEARCH_PROMOTION,
    price: 500,
    currency: 'TRY',
    durationDays: 7,
    isActive: true,
    metadata: {},
  };
  const product = {
    id: 'product-1',
    sellerId: 'seller-1',
    categoryId: 'category-1',
    status: ProductStatus.ACTIVE,
  };
  const adRequest = {
    id: 'ad-1',
    sellerId: 'seller-1',
    productId: 'product-1',
    packageId: 'package-1',
    adPackage,
    placementType: AdPlacementType.SEARCH_PROMOTION,
    status: AdRequestStatus.ADMIN_REVIEW,
    amount: 500,
    currency: 'TRY',
    walletHoldId: 'hold-1',
    reviewReason: null,
    approvedAt: null,
    rejectedAt: null,
    publishedAt: null,
    startsAt: null,
    endsAt: null,
    idempotencyKey: 'idem-1',
    metadata: {
      categoryId: 'category-1',
      slotKey: 'search-top',
    },
    product,
    placements: [],
  };

  beforeEach(async () => {
    adPackageRepo = {
      find: jest.fn().mockResolvedValue([adPackage]),
      findOne: jest.fn().mockResolvedValue(adPackage),
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    adRequestRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      findAndCount: jest.fn().mockResolvedValue([[adRequest], 1]),
      create: jest.fn((value) => ({ id: 'ad-1', ...value })),
      save: jest.fn((value) => Promise.resolve({ id: 'ad-1', ...value })),
    };
    adPlacementRepo = {
      create: jest.fn((value) => ({ id: 'placement-1', ...value })),
      save: jest.fn((value) =>
        Promise.resolve({ id: 'placement-1', ...value }),
      ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest
        .fn()
        .mockReturnValue(createPlacementQueryBuilder([])),
    };
    productRepo = {
      findOne: jest.fn().mockResolvedValue(product),
    };
    walletService = {
      createHold: jest.fn().mockResolvedValue({ id: 'hold-1' }),
      releaseHold: jest.fn().mockResolvedValue({ id: 'hold-1' }),
      captureHold: jest.fn().mockResolvedValue({ id: 'hold-1' }),
    };
    adminAuditService = {
      recordAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };
    membershipService = {
      getSellerBenefits: jest.fn().mockResolvedValue({
        visibilityBoost: 0,
        adCredits: 0,
        adDiscountRate: 0,
        commissionRate: 0.1,
        payoutPriority: 'standard',
        badgeLevel: 'New',
      }),
      getBenefitsForSellers: jest.fn().mockResolvedValue(new Map()),
    };
    trustService = {
      assertAllowed: jest.fn().mockResolvedValue({ allowed: true }),
    };
    const adminSettingsService = {
      list: jest.fn().mockResolvedValue({
        items: [
          {
            key: AdminSettingKey.AD_SPONSORED_DENSITY,
            value: { maxSponsoredPerPage: 2 },
          },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdsService,
        { provide: getRepositoryToken(AdPackage), useValue: adPackageRepo },
        { provide: getRepositoryToken(AdRequest), useValue: adRequestRepo },
        { provide: getRepositoryToken(AdPlacement), useValue: adPlacementRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: WalletService, useValue: walletService },
        { provide: AdminAuditService, useValue: adminAuditService },
        { provide: AdminSettingsService, useValue: adminSettingsService },
        { provide: MembershipService, useValue: membershipService },
        { provide: TrustService, useValue: trustService },
      ],
    }).compile();

    service = module.get<AdsService>(AdsService);
  });

  it('reserves funds and sets ADMIN_REVIEW when creating a request', async () => {
    const result = await service.createRequest('seller-1', {
      packageId: 'package-1',
      productId: 'product-1',
      idempotencyKey: 'idem-1',
    });

    expect(result.code).toBe(RC.AD_FUNDS_RESERVED);
    expect(walletService.createHold).toHaveBeenCalledWith(
      'ad-request:seller-1:idem-1',
      'seller-1',
      500,
    );
    expect(adRequestRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AdRequestStatus.ADMIN_REVIEW,
        walletHoldId: 'hold-1',
      }),
    );
  });

  it('applies Paketim ad credits and discount before reserving wallet funds', async () => {
    membershipService.getSellerBenefits.mockResolvedValueOnce({
      visibilityBoost: 2,
      adCredits: 100,
      adDiscountRate: 0.2,
      commissionRate: 0.08,
      payoutPriority: 'priority',
      badgeLevel: 'Trusted',
    });

    await service.createRequest('seller-1', {
      packageId: 'package-1',
      productId: 'product-1',
      idempotencyKey: 'idem-benefit',
    });

    expect(walletService.createHold).toHaveBeenCalledWith(
      'ad-request:seller-1:idem-benefit',
      'seller-1',
      320,
    );
    expect(adRequestRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 320,
        metadata: expect.objectContaining({
          baseAmount: 500,
          adCreditsApplied: 100,
          adDiscountRate: 0.2,
          reservedAmount: 320,
        }),
      }),
    );
  });

  it('pauses active placements when ADS_CAMPAIGNS_LOCK blocks new ad requests', async () => {
    trustService.assertAllowed.mockRejectedValueOnce(
      new ForbiddenException({ code: RC.FORBIDDEN, message: 'locked' }),
    );
    adPlacementRepo.createQueryBuilder.mockReturnValue(
      createPlacementQueryBuilder([
        {
          id: 'placement-1',
          isActive: true,
          adRequest: {
            ...adRequest,
            status: AdRequestStatus.ACTIVE,
            metadata: {},
          },
        },
      ]),
    );

    await expect(
      service.createRequest('seller-1', {
        packageId: 'package-1',
        productId: 'product-1',
        idempotencyKey: 'idem-locked',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(adPlacementRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    );
    expect(adRequestRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          pausedByRestriction: 'ADS_CAMPAIGNS_LOCK',
        }),
      }),
    );
    expect(walletService.createHold).not.toHaveBeenCalled();
  });

  it('orders visibilityBoost sponsored results ahead of organic without hiding organic items', async () => {
    membershipService.getBenefitsForSellers.mockResolvedValueOnce(
      new Map([
        [
          'seller-1',
          {
            visibilityBoost: 5,
            adCredits: 0,
            adDiscountRate: 0,
            commissionRate: 0.1,
            payoutPriority: 'priority',
            badgeLevel: 'Trusted',
          },
        ],
      ]),
    );
    adPlacementRepo.createQueryBuilder.mockReturnValue(
      createPlacementQueryBuilder([
        {
          adRequestId: 'ad-1',
          placementType: AdPlacementType.SEARCH_PROMOTION,
          adRequest: {
            ...adRequest,
            sellerId: 'seller-1',
            productId: 'product-1',
          },
        },
      ]),
    );

    const result = await service.annotateSponsoredProducts(
      [{ id: 'product-2' }, { id: 'product-1' }],
      AdPlacementType.SEARCH_PROMOTION,
    );

    expect(result.map((item) => item.id)).toEqual(['product-1', 'product-2']);
    expect(result[0]).toEqual(
      expect.objectContaining({ isSponsored: true, visibilityBoost: 5 }),
    );
    expect(result[1]).toEqual(expect.objectContaining({ isSponsored: false }));
  });

  it('releases reservation when rejecting a request', async () => {
    adRequestRepo.findOne.mockResolvedValue({ ...adRequest });

    const result = await service.rejectRequest(
      'ad-1',
      { reason: 'Creative mismatch' },
      actor,
    );

    expect(result.code).toBe(RC.AD_REJECTED);
    expect(walletService.releaseHold).toHaveBeenCalledWith(
      'ad-request:seller-1:idem-1',
      'seller-1',
    );
    expect(adminAuditService.recordAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: AdminAuditAction.AD_REJECTED }),
    );
  });

  it('schedules placement when approving a request', async () => {
    adRequestRepo.findOne.mockResolvedValue({ ...adRequest });

    const result = await service.approveRequest(
      'ad-1',
      { reason: 'Approved for launch', slotKey: 'search-top' },
      actor,
    );

    expect(result.code).toBe(RC.AD_APPROVED);
    expect(adPlacementRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        placementType: AdPlacementType.SEARCH_PROMOTION,
        slotKey: 'search-top',
      }),
    );
    expect(adminAuditService.recordAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: AdminAuditAction.AD_APPROVED }),
    );
  });

  it('does not charge wallet or mutate placement when AD_SLOT_CONFLICT fails', async () => {
    adRequestRepo.findOne.mockResolvedValue({ ...adRequest });
    adPlacementRepo.createQueryBuilder.mockReturnValue(
      createPlacementQueryBuilder([
        {
          adRequestId: 'existing-ad',
          placementType: AdPlacementType.SEARCH_PROMOTION,
          categoryId: 'category-1',
          slotKey: 'search-top',
          startsAt: new Date('2026-04-28T10:00:00Z'),
          endsAt: new Date('2026-04-28T12:00:00Z'),
        },
      ]),
    );

    await expect(
      service.approveRequest(
        'ad-1',
        {
          reason: 'Conflicting launch',
          categoryId: 'category-1',
          slotKey: 'search-top',
          startsAt: '2026-04-28T11:00:00Z',
          endsAt: '2026-04-28T13:00:00Z',
        },
        actor,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: RC.AD_SLOT_CONFLICT }),
    });
    expect(walletService.captureHold).not.toHaveBeenCalled();
    expect(adRequestRepo.save).not.toHaveBeenCalled();
    expect(adPlacementRepo.save).not.toHaveBeenCalled();
  });

  it('enforces density cap for sponsored placements', async () => {
    adPlacementRepo.createQueryBuilder.mockReturnValue(
      createPlacementQueryBuilder([
        { adRequestId: 'ad-1', categoryId: 'category-1', slotKey: 'slot-a' },
        { adRequestId: 'ad-2', categoryId: 'category-1', slotKey: 'slot-b' },
      ]),
    );

    await expect(
      service.assertSlotAvailable({
        placementType: AdPlacementType.SEARCH_PROMOTION,
        categoryId: 'category-1',
        slotKey: null,
        startsAt: new Date('2026-04-28T10:00:00Z'),
        endsAt: new Date('2026-04-28T12:00:00Z'),
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: RC.AD_SLOT_CONFLICT }),
    });
  });

  it('allows boundary end/start times without conflict', async () => {
    adPlacementRepo.createQueryBuilder.mockReturnValue(
      createPlacementQueryBuilder([]),
    );

    await expect(
      service.assertSlotAvailable({
        placementType: AdPlacementType.SEARCH_PROMOTION,
        categoryId: 'category-1',
        slotKey: 'search-top',
        startsAt: new Date('2026-04-28T12:00:00Z'),
        endsAt: new Date('2026-04-28T13:00:00Z'),
      }),
    ).resolves.toBeUndefined();
  });

  it('returns slot calendar and conflict response codes', async () => {
    adPlacementRepo.createQueryBuilder.mockReturnValue(
      createPlacementQueryBuilder([
        {
          adRequestId: 'ad-1',
          categoryId: 'category-1',
          slotKey: 'search-top',
        },
      ]),
    );

    const calendar = await service.getSlotCalendar({
      placementType: AdPlacementType.SEARCH_PROMOTION,
      categoryId: 'category-1',
      slotKey: 'search-top',
      from: '2026-04-28T10:00:00Z',
      to: '2026-04-28T12:00:00Z',
    });
    const conflicts = await service.getSlotConflicts({
      placementType: AdPlacementType.SEARCH_PROMOTION,
      categoryId: 'category-1',
      slotKey: 'search-top',
      from: '2026-04-28T10:00:00Z',
      to: '2026-04-28T12:00:00Z',
    });

    expect(calendar.code).toBe(RC.AD_SLOT_CALENDAR_FETCHED);
    expect(conflicts.code).toBe(RC.AD_SLOT_CONFLICTS_FETCHED);
  });

  it('charges reservation when publishing an approved request', async () => {
    adRequestRepo.findOne.mockResolvedValue({
      ...adRequest,
      status: AdRequestStatus.APPROVED,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 86400000),
    });

    const result = await service.publishApprovedRequest('ad-1');

    expect(result.code).toBe(RC.AD_PUBLISHED);
    expect(walletService.captureHold).toHaveBeenCalledWith(
      'ad-request:seller-1:idem-1',
      'seller-1',
    );
    expect(adPlacementRepo.update).toHaveBeenCalledWith(
      { adRequestId: 'ad-1' },
      expect.objectContaining({ isActive: true }),
    );
  });

  it('adds sponsoredLabel metadata for active sponsored products', async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          adRequestId: 'ad-1',
          placementType: AdPlacementType.SEARCH_PROMOTION,
          adRequest: { productId: 'product-1' },
        },
      ]),
    };
    adPlacementRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.annotateSponsoredProducts(
      [{ id: 'product-1', categoryId: 'category-1' }],
      AdPlacementType.SEARCH_PROMOTION,
      'category-1',
    );

    expect(result[0].isSponsored).toBe(true);
    expect(result[0].sponsoredLabel).toBe('Sponsorlu');
    expect(result[0].adRequestId).toBe('ad-1');
  });
});
