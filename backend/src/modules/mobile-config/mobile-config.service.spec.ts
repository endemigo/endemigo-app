import { BadRequestException } from '@nestjs/common';
import {
  AdminAuditAction,
  AdminRole,
  DEFAULT_PRODUCT_IMAGE_UPLOAD_LIMITS,
  MOBILE_LISTING_CREATE_OPTIONAL_FIELDS,
  MobileAudience,
  MobileBlockType,
  MobileConfigStatus,
  MobileSurfaceKey,
  RC,
  type MobileExperienceConfig,
} from '@endemigo/shared';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';
import { MobileConfigService } from './mobile-config.service';

function createDraft(): MobileExperienceConfig {
  return {
    schemaVersion: 1,
    home: {
      heroBanners: [
        {
          id: 'hero-auction',
          type: MobileBlockType.HERO_BANNER,
          enabled: true,
          order: 1,
          audiences: [MobileAudience.GUEST, MobileAudience.BUYER],
          surface: MobileSurfaceKey.HOME,
          badge: { tr: 'Muzayede', en: 'Auction' },
          title: { tr: 'Canli Muzayedeler', en: 'Live Auctions' },
          subtitle: { tr: 'Nadir parcalar', en: 'Rare pieces' },
          imageUrl: 'https://example.com/hero.jpg',
          cta: {
            label: { tr: 'Teklif Ver', en: 'Bid Now' },
            route: '/(tabs)/auctions',
          },
        },
      ],
      entryTiles: [
        {
          id: 'buy-now',
          type: MobileBlockType.ENTRY_TILE,
          enabled: true,
          order: 1,
          audiences: [
            MobileAudience.GUEST,
            MobileAudience.BUYER,
            MobileAudience.SELLER,
          ],
          surface: MobileSurfaceKey.HOME,
          title: { tr: 'Hemen Al', en: 'Buy Now' },
          subtitle: { tr: 'Bugun kesfet', en: 'Explore today' },
          cta: {
            label: { tr: 'Kesfet', en: 'Explore' },
            route: '/buy-now',
          },
        },
      ],
      sections: [
        {
          id: 'campaigns',
          type: MobileBlockType.HOME_SECTION,
          enabled: true,
          order: 4,
          audiences: [MobileAudience.BUYER],
          surface: MobileSurfaceKey.HOME,
          title: { tr: 'Guncel Kampanyalar', en: 'Current Campaigns' },
          seeAllLabel: { tr: 'Tumunu Gor', en: 'See All' },
          route: '/(tabs)/categories',
        },
      ],
      promoBanners: [],
      trustBlocks: [],
    },
    cards: {
      productCard: {
        surface: MobileSurfaceKey.PRODUCT_CARD,
        badge: { tr: 'One Cikan', en: 'Featured' },
        showCategory: true,
        showPrice: true,
        showAskPriceBadge: true,
        ctaLabel: { tr: 'Incele', en: 'View' },
      },
    },
    auctions: {
      listCard: {
        surface: MobileSurfaceKey.AUCTIONS_LIST,
        ctaLabel: { tr: 'Teklif Ver', en: 'Bid Now' },
        liveBadgeLabel: { tr: 'Canli', en: 'Live' },
        showBidCount: true,
        showStatusBadge: true,
        showTimer: true,
      },
    },
    listingCreate: {
      optionalFields: [...MOBILE_LISTING_CREATE_OPTIONAL_FIELDS],
    },
    otherSurfaces: [],
    preview: {
      defaultAudience: MobileAudience.BUYER,
      defaultLocale: 'tr',
    },
  };
}

describe('MobileConfigService', () => {
  let repo: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let adminAuditService: {
    recordAction: jest.Mock;
  };
  let adminSettingsService: {
    getProductImageUploadLimits: jest.Mock;
  };
  let service: MobileConfigService;

  beforeEach(() => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((value) => ({ id: 'mobile-config-1', ...value })),
      save: jest.fn(async (value) => value),
    };
    adminAuditService = {
      recordAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };
    adminSettingsService = {
      getProductImageUploadLimits: jest
        .fn()
        .mockResolvedValue(DEFAULT_PRODUCT_IMAGE_UPLOAD_LIMITS),
    };
    service = new MobileConfigService(
      repo as never,
      adminAuditService as unknown as AdminAuditService,
      adminSettingsService as unknown as AdminSettingsService,
    );
  });

  it('returns default draft when document does not exist', async () => {
    const result = await service.getDraft();

    expect(result.code).toBe(RC.MOBILE_CONFIG_DRAFT_FETCHED);
    expect(result.document.status).toBe(MobileConfigStatus.DRAFT);
    expect(result.document.draft.home.heroBanners.length).toBeGreaterThan(0);
  });

  it.skip('rejects invalid draft payloads', async () => {
    try {
      await service.updateDraft({
        actorAdminId: 'admin-1',
        actorRoles: [AdminRole.OPERATIONS],
        draft: {
          ...createDraft(),
          home: {
            ...createDraft().home,
            heroBanners: [
              {
                ...createDraft().home.heroBanners[0],
                cta: {
                  label: { tr: 'Bozuk', en: 'Broken' },
                  route: 'not-a-route',
                },
              },
            ],
          },
        },
        version: 1,
        reason: 'invalid payload should fail',
      });
      throw new Error('expected BadRequestException');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        code: string;
        errors: Array<{ path: string; code: string; message: string }>;
      };
      expect(response.code).toBe(RC.VALIDATION_ERROR);
      expect(response.errors[0]).toEqual(
        expect.objectContaining({
          path: 'home.heroBanners[0].cta.route',
          code: 'INVALID_ROUTE_FORMAT',
        }),
      );
    }
  });

  it('updates the singleton draft and records an audit entry', async () => {
    const draft = createDraft();

    const result = await service.updateDraft({
      actorAdminId: 'admin-2',
      actorRoles: [AdminRole.OPERATIONS],
      draft,
      version: 1,
      reason: 'homepage cta refresh',
    });

    expect(result.code).toBe(RC.MOBILE_CONFIG_DRAFT_UPDATED);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        draft,
        version: 2,
        updatedByAdminId: 'admin-2',
      }),
    );
    expect(adminAuditService.recordAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AdminAuditAction.SETTING_UPDATED,
        targetId: 'MOBILE_CONFIG_DRAFT',
      }),
    );
  });

  it('publishes the validated draft snapshot', async () => {
    repo.find.mockResolvedValue([
      {
        id: 'mobile-config-1',
        draft: createDraft(),
        published: null,
        version: 2,
        updatedByAdminId: 'admin-2',
        publishedByAdminId: null,
        publishedAt: null,
      },
    ]);

    const result = await service.publish({
      actorAdminId: 'admin-3',
      actorRoles: [AdminRole.SUPER_ADMIN],
      version: 2,
      reason: 'release approved',
    });

    expect(result.code).toBe(RC.MOBILE_CONFIG_PUBLISHED);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        published: createDraft(),
        version: 3,
        publishedByAdminId: 'admin-3',
      }),
    );
    expect(adminAuditService.recordAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AdminAuditAction.SETTING_UPDATED,
        targetId: 'MOBILE_CONFIG_PUBLISHED',
      }),
    );
  });

  it('throws conflict when draft version is stale', async () => {
    repo.find.mockResolvedValue([
      {
        id: 'mobile-config-1',
        draft: createDraft(),
        published: null,
        version: 4,
        updatedByAdminId: 'admin-2',
        publishedByAdminId: null,
        publishedAt: null,
      },
    ]);

    await expect(
      service.updateDraft({
        actorAdminId: 'admin-5',
        actorRoles: [AdminRole.OPERATIONS],
        draft: createDraft(),
        version: 3,
        reason: 'stale update',
      }),
    ).rejects.toThrow('Taslak baska bir yonetici tarafindan guncellenmis');
  });

  it('includes public image upload limits in mobile config payload', async () => {
    const result = await service.getPublicConfig();

    expect(result.imageUploadLimits).toEqual(
      DEFAULT_PRODUCT_IMAGE_UPLOAD_LIMITS,
    );
    expect(adminSettingsService.getProductImageUploadLimits).toHaveBeenCalled();
  });
});
