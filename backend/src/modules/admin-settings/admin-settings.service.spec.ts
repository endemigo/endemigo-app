import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdminAuditAction, AdminRole, AdminSettingKey, RC } from '@endemigo/shared';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { AdminSettingsService } from './admin-settings.service';

describe('AdminSettingsService', () => {
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let adminAuditService: {
    recordAction: jest.Mock;
  };
  let service: AdminSettingsService;

  beforeEach(() => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => ({ id: 'setting-1', ...value })),
      save: jest.fn(async (value) => value),
    };
    adminAuditService = {
      recordAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };
    service = new AdminSettingsService(
      repo as never,
      adminAuditService as unknown as AdminAuditService,
    );
  });

  it('lists defaults when settings table is empty', async () => {
    const result = await service.list();
    const managedKeys = Object.values(AdminSettingKey).filter(
      (key) => key !== AdminSettingKey.CONTENT_STUDIO,
    );

    expect(result.code).toBe(RC.SUCCESS);
    expect(result.items.length).toBe(managedKeys.length);
    expect(result.items.map((item) => item.key)).toEqual(
      expect.arrayContaining(managedKeys),
    );
    expect(result.items.map((item) => item.key)).not.toContain(
      AdminSettingKey.CONTENT_STUDIO,
    );
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ key: AdminSettingKey.AD_SPONSORED_DENSITY }),
    );
  });

  it('rejects content studio setting updates on admin settings endpoint', async () => {
    await expect(
      service.update({
        actorAdminId: 'admin-1',
        actorRoles: [AdminRole.OPERATIONS],
        key: AdminSettingKey.CONTENT_STUDIO,
        value: {},
        reason: 'should use content studio endpoint',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws when non-finance roles update commission settings', async () => {
    await expect(
      service.update({
        actorAdminId: 'admin-1',
        actorRoles: [AdminRole.OPERATIONS],
        key: AdminSettingKey.COMMISSION_DEFAULT_RATE,
        value: { rate: 0.2 },
        reason: 'finance only',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates missing setting and records audit for finance update', async () => {
    const result = await service.update({
      actorAdminId: 'admin-1',
      actorRoles: [AdminRole.FINANCE],
      key: AdminSettingKey.COMMISSION_DEFAULT_RATE,
      value: { rate: 0.12 },
      reason: 'monthly pricing review',
    });

    expect(result.code).toBe(RC.ADMIN_SETTING_UPDATED);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        value: { rate: 0.12 },
        isSensitive: true,
      }),
    );
    expect(adminAuditService.recordAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AdminAuditAction.SETTING_UPDATED,
        targetId: AdminSettingKey.COMMISSION_DEFAULT_RATE,
      }),
    );
  });

  it('validates product image upload limits payload', async () => {
    await expect(
      service.update({
        actorAdminId: 'admin-1',
        actorRoles: [AdminRole.OPERATIONS],
        key: AdminSettingKey.PRODUCT_IMAGE_UPLOAD_LIMITS,
        value: { min: 5, max: 3 },
        reason: 'invalid image limits',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
