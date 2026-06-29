import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminAuditAction, AdminRole, PayoutRequestStatus, RC } from '@endemigo/shared';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { SellerStatus } from '../user/entities/seller-profile.entity';
import { AdminOperationsService } from './admin-operations.service';

type MockRepo = {
  count: jest.Mock;
  find: jest.Mock;
  findAndCount: jest.Mock;
  findOne: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  softDelete: jest.Mock;
  update: jest.Mock;
  createQueryBuilder: jest.Mock;
};

function createRepo(): MockRepo {
  return {
    count: jest.fn().mockResolvedValue(0),
    find: jest.fn().mockResolvedValue([]),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn(async (value) => value),
    create: jest.fn((value) => value),
    softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawOne: jest.fn().mockResolvedValue({ value: 0 }),
      getRawMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getOne: jest.fn().mockResolvedValue(null),
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
    repos = Array.from({ length: 23 }, createRepo);
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
      repos[9] as never,
      repos[10] as never,
      repos[11] as never,
      repos[12] as never,
      repos[13] as never,
      repos[14] as never,
      repos[15] as never,
      repos[16] as never,
      repos[17] as never,
      repos[18] as never,
      repos[19] as never,
      repos[20] as never,
      repos[21] as never,
      repos[22] as never,
      adminAuditService as unknown as AdminAuditService,
    );
  });

  it('returns queue empty-state counts for admin dashboard queues', async () => {
    const result = await service.getQueues();

    expect(result.code).toBe(RC.ADMIN_QUEUE_FETCHED);
    expect(result.sellerApprovals.count).toBe(0);
    expect(repos[1].find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: SellerStatus.PENDING } }),
    );
    expect(repos[1].count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: SellerStatus.PENDING } }),
    );
    expect(repos[16].findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: PayoutRequestStatus.ADMIN_REVIEW } }),
    );
  });

  it('lists admin resources with pagination metadata', async () => {
    repos[0].findAndCount.mockResolvedValueOnce([[{ id: 'user-1', createdAt: new Date() }], 1]);

    const result: any = await service.list('users', { page: 1, limit: 10 } as any);

    expect(result.code).toBe(RC.SUCCESS);
    expect(result.pagination.total).toBe(1);
  });

  it('throws when detail resource is missing', async () => {
    await expect(service.detail('users', 'missing-user')).rejects.toThrow(NotFoundException);
  });

  it('returns seller detail when route id is seller userId', async () => {
    repos[1].findOne.mockResolvedValueOnce({
      id: 'seller-profile-1',
      userId: 'user-1',
      status: SellerStatus.APPROVED,
      createdAt: new Date('2026-05-11T00:00:00.000Z'),
    });

    const result: any = await service.detail('sellers', 'user-1');

    expect(result.code).toBe(RC.SUCCESS);
    expect(result.resource).toBe('sellers');
    expect(result.overview.id).toBe('seller-profile-1');
    expect(result.audit.targetId).toBe('seller-profile-1');
    expect(repos[1].findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [{ id: 'user-1' }, { userId: 'user-1' }],
      }),
    );
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

  it('creates variant number record', async () => {
    const result = await service.createVariantNumber({
      kind: 'NUMBER' as any,
      nameTr: ' 42 ',
      nameEn: ' 42 ',
      sortOrder: 42,
      status: 'ACTIVE' as any,
    });

    expect(result.code).toBe(RC.ADMIN_VARIANT_NUMBER_CREATED);
    expect(repos[4].create).toHaveBeenCalledWith(
      expect.objectContaining({ nameTr: '42', nameEn: '42' }),
    );
  });

  it('soft deletes variant number record', async () => {
    repos[4].findOne.mockResolvedValueOnce({
      id: 'variant-1',
      createdAt: new Date(),
    });

    const result = await service.deleteVariantNumber('variant-1');

    expect(result.code).toBe(RC.ADMIN_VARIANT_NUMBER_DELETED);
    expect(repos[4].softDelete).toHaveBeenCalledWith('variant-1');
  });

  it('creates brand record and writes admin audit', async () => {
    repos[6].save.mockResolvedValueOnce({
      id: 'brand-1',
      name: 'Cibus',
      slug: 'cibus',
      isActive: true,
      createdAt: new Date(),
    });

    const result = await service.createBrand(
      { reason: 'catalog expansion', metadata: { name: 'Cibus', slug: 'cibus', isActive: 'true' } },
      { id: 'admin-1', roles: [AdminRole.OPERATIONS] },
    );

    expect(result.code).toBe(RC.SUCCESS);
    expect(result.brand.name).toBe('Cibus');
    expect(adminAuditService.recordAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: AdminAuditAction.BRAND_CREATED }),
    );
  });

  it('creates category record and writes admin audit', async () => {
    repos[3].save.mockResolvedValueOnce({
      id: 'category-1',
      name: 'Gıda',
      slug: 'gida',
      isActive: true,
      metadata: {},
      createdAt: new Date(),
    });

    const result = await service.createCategory(
      {
        reason: 'initial setup',
        metadata: {
          name: 'Gıda',
          slug: 'gida',
          isActive: 'true',
          isCulturalAsset: 'false',
          sortOrder: '',
          listingTemplate: '',
        },
      },
      { id: 'admin-1', roles: [AdminRole.OPERATIONS] },
    );

    expect(result.code).toBe(RC.SUCCESS);
    expect(result.category.name).toBe('Gıda');
  });


  it('creates member account with admin endpoint contract', async () => {
    repos[0].save.mockResolvedValueOnce({
      id: 'user-2',
      email: 'member@endemigo.test',
      firstName: 'Member',
      lastName: 'User',
      isSeller: true,
      isActive: true,
    });

    const result = await service.createUser(
      {
        reason: 'manual onboarding',
        metadata: {
          email: 'member@endemigo.test',
          password: 'Test1234!',
          firstName: 'Member',
          lastName: 'User',
          memberType: 'SELLER',
        },
      },
      { id: 'admin-1', roles: [AdminRole.OPERATIONS] },
    );

    expect(result.code).toBe(RC.ADMIN_USER_CREATED);
    expect(result.user.email).toBe('member@endemigo.test');
    expect(result.user.isSeller).toBe(true);
  });

  it('returns detailed user related records with empty state', async () => {
    repos[0].findOne.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@endemigo.test',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      passwordHash: 'secret',
      tcKimlikNo: '123',
      isSeller: false,
      isActive: true,
    });

    const result: any = await service.detail('users', 'user-1');

    expect(result.code).toBe(RC.SUCCESS);
    expect(result.resource).toBe('users');
    expect(result.relatedRecords.summary.orderCount).toBe(0);
    expect(result.relatedRecords.orders).toEqual([]);
    expect(result.relatedRecords.pagination.orders.hasMore).toBe(false);
    expect(result.overview.passwordHash).toBeUndefined();
  });

  it('returns detailed product records with buyer and interaction summary', async () => {
    repos[2].findOne.mockResolvedValueOnce({
      id: 'product-1',
      title: 'Pekmez',
      sellerId: 'seller-1',
      status: 'ACTIVE',
      price: 120,
      stockQuantity: 8,
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      images: [],
      category: null,
    });
    repos[0].findOne.mockResolvedValueOnce({
      id: 'seller-1',
      email: 'seller@endemigo.test',
      firstName: 'Ali',
      lastName: 'Kaya',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      isSeller: true,
      isVerified: true,
      isActive: true,
    });
    repos[10].count.mockResolvedValue(0);
    repos[12].count.mockResolvedValue(0);
    repos[13].count.mockResolvedValue(0);
    repos[7].count.mockResolvedValue(0);

    const result: any = await service.detail('products', 'product-1');

    expect(result.code).toBe(RC.SUCCESS);
    expect(result.resource).toBe('products');
    expect(result.relatedRecords.summary.orderCount).toBe(0);
    expect(result.relatedRecords.buyers).toEqual([]);
  });

  it('loads user related section with pagination metadata', async () => {
    repos[0].findOne.mockResolvedValueOnce({ id: 'user-1' });
    repos[10].count.mockResolvedValueOnce(3);
    const orderQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawOne: jest.fn().mockResolvedValue({ value: 0 }),
      getRawMany: jest.fn().mockResolvedValue([
        {
          id: 'order-1',
          productId: 'product-1',
          amount: '99.9',
          currency: 'TRY',
          status: 'COMPLETED',
          createdAt: '2026-05-10T10:00:00.000Z',
          productTitle: 'Pekmez',
          counterpartId: 'seller-1',
          counterpartFirstName: 'Ali',
          counterpartLastName: 'Kaya',
          counterpartEmail: 'seller@endemigo.test',
        },
      ]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    repos[10].createQueryBuilder.mockReturnValue(orderQb);

    const result = await service.detailUserRelated('user-1', {
      section: 'orders',
      page: '1',
      limit: '1',
    });

    expect(result.code).toBe(RC.SUCCESS);
    expect(result.section).toBe('orders');
    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(3);
    expect(result.pagination.hasMore).toBe(true);
  });

  it('marks hasMore true for high-volume user datasets', async () => {
    repos[0].findOne.mockResolvedValueOnce({
      id: 'user-2',
      email: 'heavy@endemigo.test',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      passwordHash: 'secret',
      tcKimlikNo: null,
      isSeller: true,
      isActive: true,
    });
    repos[10].count.mockResolvedValueOnce(70).mockResolvedValueOnce(42);
    repos[12].count.mockResolvedValueOnce(88);
    repos[13].count.mockResolvedValueOnce(51);
    repos[14].count.mockResolvedValueOnce(33);
    repos[15].count.mockResolvedValueOnce(47);

    const result: any = await service.detail('users', 'user-2');

    expect(result.relatedRecords.pagination.orders.hasMore).toBe(true);
    expect(result.relatedRecords.pagination.sales.hasMore).toBe(true);
    expect(result.relatedRecords.pagination.favorites.hasMore).toBe(true);
    expect(result.relatedRecords.pagination.cart.hasMore).toBe(true);
    expect(result.relatedRecords.pagination.couponDefinitions.hasMore).toBe(true);
    expect(result.relatedRecords.pagination.couponUsage.hasMore).toBe(true);
  });

  describe('reorderLots', () => {
    const mockActor = { id: 'admin-1', roles: [AdminRole.OPERATIONS] };

    it('successfully updates sequence for non-finished lots', async () => {
      const mockEvent = { id: 'event-1', title: 'Live Event' };
      repos[8].findOne.mockResolvedValueOnce(mockEvent); // findOneOrFail resolves mockEvent

      const mockLots = [
        { id: 'lot-1', eventId: 'event-1', status: 'PUBLISHED', sequenceNumber: 1, lotNumber: '1' },
        { id: 'lot-2', eventId: 'event-1', status: 'ACTIVE', sequenceNumber: 2, lotNumber: '2' },
      ];
      repos[7].find.mockResolvedValueOnce(mockLots);

      const result = await service.reorderLots(
        'event-1',
        { 'lot-1': 2, 'lot-2': 1 },
        mockActor
      );

      expect(result.code).toBe(RC.SUCCESS);
      expect(mockLots[0].sequenceNumber).toBe(2);
      expect(mockLots[1].sequenceNumber).toBe(1);
      expect(repos[7].save).toHaveBeenCalledWith(mockLots);
    });

    it('throws BadRequestException when trying to reorder a finished lot', async () => {
      const mockEvent = { id: 'event-1', title: 'Live Event' };
      repos[8].findOne.mockResolvedValueOnce(mockEvent);

      const mockLots = [
        { id: 'lot-1', eventId: 'event-1', status: 'ENDED', sequenceNumber: 1, lotNumber: '1' },
        { id: 'lot-2', eventId: 'event-1', status: 'PUBLISHED', sequenceNumber: 2, lotNumber: '2' },
      ];
      repos[7].find.mockResolvedValueOnce(mockLots);

      await expect(
        service.reorderLots(
          'event-1',
          { 'lot-1': 2, 'lot-2': 1 },
          mockActor
        )
      ).rejects.toThrow(BadRequestException);
    });
  });
});
