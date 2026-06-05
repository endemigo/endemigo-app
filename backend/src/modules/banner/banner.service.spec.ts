import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminAuditAction, AdminRole, BannerActionType, RC } from '@endemigo/shared';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { BannerService } from './banner.service';

describe('BannerService', () => {
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    softRemove: jest.Mock;
  };
  let adminAuditService: {
    recordAction: jest.Mock;
  };
  let service: BannerService;

  const actor = {
    actorAdminId: 'admin-1',
    actorRoles: [AdminRole.SUPER_ADMIN],
    reason: 'test reason',
  };

  beforeEach(() => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((val) => ({ id: 'banner-1', ...val })),
      save: jest.fn(async (val) => val),
      softRemove: jest.fn().mockResolvedValue(undefined),
    };
    adminAuditService = {
      recordAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };
    service = new BannerService(
      repo as never,
      adminAuditService as unknown as AdminAuditService,
    );
  });

  describe('createBanner', () => {
    it('creates a new banner successfully', async () => {
      const dto = {
        name: 'Ana Sayfa Bannerı',
        slug: 'home-banner',
        slideDuration: 4000,
        aspectRatio: '16:9' as const,
        items: [
          {
            id: 'item-1',
            imageUrl: 'https://example.com/1.jpg',
            actionType: BannerActionType.CATEGORY,
            actionValue: 'category-1',
          },
        ],
      };

      const result = await service.createBanner(dto, actor);

      expect(result.code).toBe(RC.BANNER_CREATED);
      expect(repo.save).toHaveBeenCalled();
      expect(adminAuditService.recordAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AdminAuditAction.SETTING_UPDATED,
          targetId: 'BANNER_banner-1',
        }),
      );
    });

    it('throws ConflictException if slug already exists', async () => {
      repo.findOne.mockResolvedValue({ id: 'existing-id', slug: 'home-banner' });

      const dto = {
        name: 'Yeni Banner',
        slug: 'home-banner',
        items: [],
      };

      await expect(service.createBanner(dto, actor)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateBanner', () => {
    it('updates existing banner fields', async () => {
      const banner = {
        id: 'banner-1',
        name: 'Eski Banner',
        slug: 'old-banner',
        slideDuration: 3000,
        aspectRatio: '16:9' as const,
        items: [],
      };
      repo.findOne.mockResolvedValue(banner);

      const dto = {
        name: 'Güncel Banner',
        slideDuration: 5000,
      };

      const result = await service.updateBanner('banner-1', dto, actor);

      expect(result.code).toBe(RC.BANNER_UPDATED);
      expect(result.banner.name).toBe('Güncel Banner');
      expect(result.banner.slideDuration).toBe(5000);
      expect(repo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException if banner does not exist', async () => {
      await expect(service.updateBanner('missing-id', { name: 'New' }, actor)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteBanner', () => {
    it('deletes the banner and records audit action', async () => {
      const banner = { id: 'banner-1', name: 'To Delete' };
      repo.findOne.mockResolvedValue(banner);

      const result = await service.deleteBanner('banner-1', actor);

      expect(result.code).toBe(RC.BANNER_DELETED);
      expect(repo.softRemove).toHaveBeenCalledWith(banner);
    });
  });
});
