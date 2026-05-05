import { BadRequestException } from '@nestjs/common';
import { AdminAuditAction, AdminRole, RC } from '@endemigo/shared';
import { AdminAuditService } from './admin-audit.service';

describe('AdminAuditService', () => {
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
  };
  let service: AdminAuditService;

  beforeEach(() => {
    repo = {
      create: jest.fn((value) => ({ id: 'audit-1', ...value })),
      save: jest.fn(async (value) => value),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    service = new AdminAuditService(repo as never);
  });

  it('records audited admin actions with trimmed reason', async () => {
    const result = await service.recordAction({
      actorAdminId: 'admin-1',
      actorRoles: [AdminRole.OPERATIONS],
      action: AdminAuditAction.SELLER_APPROVED,
      targetType: 'SELLER',
      targetId: 'seller-1',
      reason: ' approved docs ',
    });

    expect(result.reason).toBe('approved docs');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'SELLER',
      }),
    );
  });

  it('throws when reason is missing for mutating admin actions', async () => {
    await expect(
      service.recordAction({
        actorAdminId: 'admin-1',
        actorRoles: [AdminRole.OPERATIONS],
        action: AdminAuditAction.USER_RESTRICTED,
        targetType: 'USER',
        targetId: 'user-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows admin login audit without reason and clamps list pagination', async () => {
    await service.recordAction({
      actorAdminId: 'admin-1',
      actorRoles: [AdminRole.SUPER_ADMIN],
      action: AdminAuditAction.ADMIN_LOGIN,
      targetType: 'ADMIN',
      targetId: 'admin-1',
    });

    const result = await service.list({ page: -2, limit: 500 });
    expect(result.code).toBe(RC.ADMIN_AUDIT_FETCHED);
    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 100,
      }),
    );
  });
});
