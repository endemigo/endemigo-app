import { NotFoundException } from '@nestjs/common';
import { AdminAuditAction, AdminRole, PayoutRequestStatus, RC } from '@endemigo/shared';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { SellerStatus } from '../user/entities/seller-profile.entity';
import { AdminOperationsService } from './admin-operations.service';

type MockRepo = {
  count: jest.Mock;
  findAndCount: jest.Mock;
  findOne: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  createQueryBuilder: jest.Mock;
};

function createRepo(): MockRepo {
  return {
    count: jest.fn().mockResolvedValue(0),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn(async (value) => value),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawOne: jest.fn().mockResolvedValue({ value: 0 }),
    })),
  };
}

describe('AdminOperationsService', () => {
  let repos: MockRepo[];
  let adminAuditService: {
    recordAction: jest.Mock;
  };
  let service: AdminOperationsService;

  beforeEach(() => {
    repos = Array.from({ length: 9 }, createRepo);
    adminAuditService = {
      recordAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };
    service = new AdminOperationsService(
      repos[0] as never,
      repos[1] as never,
      repos[2] as never,
      repos[3] as never,
      repos[4] as never,
      repos[5] as never,
      repos[6] as never,
      repos[7] as never,
      repos[8] as never,
      adminAuditService as unknown as AdminAuditService,
    );
  });

  it('returns queue empty-state counts for admin dashboard queues', async () => {
    const result = await service.getQueues();

    expect(result.code).toBe(RC.ADMIN_QUEUE_FETCHED);
    expect(result.sellerApprovals.count).toBe(0);
    expect(repos[1].findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: SellerStatus.PENDING } }),
    );
    expect(repos[8].findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: PayoutRequestStatus.ADMIN_REVIEW } }),
    );
  });

  it('lists admin resources with pagination metadata', async () => {
    repos[0].findAndCount.mockResolvedValueOnce([[{ id: 'user-1', createdAt: new Date() }], 1]);

    const result = await service.list('users', { page: 1, limit: 10 });

    expect(result.code).toBe(RC.SUCCESS);
    expect(result.pagination.total).toBe(1);
  });

  it('throws when detail resource is missing', async () => {
    await expect(service.detail('users', 'missing-user')).rejects.toThrow(NotFoundException);
  });

  it('approves seller and records audit action', async () => {
    repos[1].findOne.mockResolvedValueOnce({
      id: 'seller-profile-1',
      userId: 'seller-1',
      status: SellerStatus.PENDING,
      approvedAt: null,
    });

    const result = await service.approveSeller(
      'seller-profile-1',
      { reason: 'documents verified' },
      { id: 'admin-1', roles: [AdminRole.OPERATIONS] },
    );

    expect(result.code).toBe(RC.SUCCESS);
    expect(repos[0].update).toHaveBeenCalledWith('seller-1', { isSeller: true });
    expect(adminAuditService.recordAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: AdminAuditAction.SELLER_APPROVED }),
    );
  });
});
