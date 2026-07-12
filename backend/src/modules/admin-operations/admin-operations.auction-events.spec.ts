import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdminRole, RC } from '@endemigo/shared';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { AdminOperationsService } from './admin-operations.service';

// Faz 0/2/3: auction-event guard'ları için izole spec.
// Mevcut admin-operations.service.spec.ts'in (alakasız) derleme hatalarından bağımsız.

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
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
    })),
  };
}

// Constructor repo sırası (0-based): 1=sellerProfile, 2=product, 7=auction, 8=auctionEvent.
const SELLER_PROFILE = 1;
const PRODUCT = 2;
const AUCTION = 7;
const AUCTION_EVENT = 8;

const adminActor = { id: 'admin-1', roles: [AdminRole.OPERATIONS] };
const sellerActor = { id: 'seller-1', roles: ['seller' as AdminRole] };

const validDates = {
  startTime: '2026-07-10T10:00:00.000Z',
  endTime: '2026-07-11T10:00:00.000Z',
};

describe('AdminOperationsService — auction event guards', () => {
  let repos: MockRepo[];
  let service: AdminOperationsService;

  beforeEach(() => {
    repos = Array.from({ length: 23 }, createRepo);
    const adminAuditService = {
      recordAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };
    service = new (AdminOperationsService as any)(
      ...repos,
      adminAuditService as unknown as AdminAuditService,
    );
  });

  const dto = (metadata: Record<string, unknown>) => ({
    reason: 'test',
    metadata,
  });

  describe('createAuctionEvent date validation', () => {
    it('rejects when endTime <= startTime', async () => {
      await expect(
        service.createAuctionEvent(
          dto({
            title: 'X',
            startTime: validDates.endTime,
            endTime: validDates.startTime,
          }),
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when submissionDeadline is after startTime', async () => {
      await expect(
        service.createAuctionEvent(
          dto({
            ...validDates,
            title: 'X',
            submissionDeadline: '2026-07-12T00:00:00.000Z',
          }),
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects status outside DRAFT/APPLICATION at creation', async () => {
      await expect(
        service.createAuctionEvent(
          dto({ ...validDates, title: 'X', status: 'ACTIVE' }),
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a valid DRAFT event', async () => {
      const result = await service.createAuctionEvent(
        dto({ ...validDates, title: 'X' }),
        adminActor,
      );
      expect(result.code).toBe(RC.SUCCESS);
      expect(repos[AUCTION_EVENT].save).toHaveBeenCalled();
    });
  });

  describe('createAuctionEvent tier gate (Faz 3)', () => {
    it('blocks a seller without canCreateIndependent', async () => {
      repos[SELLER_PROFILE].findOne.mockResolvedValueOnce({
        userId: 'seller-1',
        canCreateIndependent: false,
        canCreateJoint: false,
      });
      await expect(
        service.createAuctionEvent(
          dto({
            ...validDates,
            title: 'X',
            systemType: 'INDEPENDENT',
            guaranteeAccepted: 'true',
            preContractAccepted: 'true',
          }),
          sellerActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a seller with canCreateIndependent', async () => {
      repos[SELLER_PROFILE].findOne.mockResolvedValueOnce({
        userId: 'seller-1',
        canCreateIndependent: true,
        canCreateJoint: false,
      });
      const result = await service.createAuctionEvent(
        dto({
          ...validDates,
          title: 'X',
          systemType: 'INDEPENDENT',
          guaranteeAccepted: 'true',
          preContractAccepted: 'true',
        }),
        sellerActor,
      );
      expect(result.code).toBe(RC.SUCCESS);
    });
  });

  describe('addLotsToEvent guards (Faz 0)', () => {
    const openEvent = {
      id: 'event-1',
      status: 'DRAFT',
      ownerId: null,
      submissionDeadline: null,
      startTime: new Date(validDates.startTime),
      endTime: new Date(validDates.endTime),
      antiSnipingEnabled: true,
      maxExtensions: 5,
      extensionSeconds: 60,
      extensionDuration: 60,
      maxProductsCount: 0,
    };

    it('rejects adding lots to a closed (ENDED) event', async () => {
      repos[AUCTION_EVENT].findOne.mockResolvedValueOnce({
        ...openEvent,
        status: 'ENDED',
      });
      await expect(
        service.addLotsToEvent(
          'event-1',
          dto({
            items: [{ productId: 'p1', startingPrice: 100, lotOrder: 1 }],
          }),
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a duplicate product within the same batch', async () => {
      repos[AUCTION_EVENT].findOne.mockResolvedValueOnce({ ...openEvent });
      await expect(
        service.addLotsToEvent(
          'event-1',
          dto({
            items: [
              { productId: 'p1', startingPrice: 100, lotOrder: 1 },
              { productId: 'p1', startingPrice: 120, lotOrder: 2 },
            ],
          }),
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a non-positive starting price', async () => {
      repos[AUCTION_EVENT].findOne.mockResolvedValueOnce({ ...openEvent });
      await expect(
        service.addLotsToEvent(
          'event-1',
          dto({ items: [{ productId: 'p1', startingPrice: 0, lotOrder: 1 }] }),
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('enforces maxProductsCount when set', async () => {
      repos[AUCTION_EVENT].findOne.mockResolvedValueOnce({
        ...openEvent,
        maxProductsCount: 1,
      });
      repos[AUCTION].count.mockResolvedValueOnce(1); // already at the cap
      await expect(
        service.addLotsToEvent(
          'event-1',
          dto({
            items: [{ productId: 'p1', startingPrice: 100, lotOrder: 1 }],
          }),
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('adds valid lots to an open event', async () => {
      repos[AUCTION_EVENT].findOne.mockResolvedValueOnce({ ...openEvent });
      repos[PRODUCT].find.mockResolvedValueOnce([
        { id: 'p1', sellerId: 'seller-9' },
      ]);
      const result = await service.addLotsToEvent(
        'event-1',
        dto({
          items: [
            {
              productId: 'p1',
              startingPrice: 100,
              minIncrement: 5,
              lotOrder: 1,
            },
          ],
        }),
        adminActor,
      );
      expect(result.code).toBe(RC.SUCCESS);
      expect(repos[AUCTION].save).toHaveBeenCalled();
    });
  });

  describe('listAssignableAuctioneers (Faz 6)', () => {
    it('returns only active SUPER_ADMIN / OPERATIONS admins', async () => {
      const adminRepo = {
        find: jest.fn().mockResolvedValue([
          {
            id: 'a1',
            displayName: 'Op One',
            email: 'op1@x.com',
            roles: [AdminRole.OPERATIONS],
          },
          {
            id: 'a2',
            displayName: 'Support',
            email: 's@x.com',
            roles: [AdminRole.SUPPORT],
          },
          {
            id: 'a3',
            displayName: 'Super',
            email: 'su@x.com',
            roles: [AdminRole.SUPER_ADMIN],
          },
        ]),
      };
      // userRepo = repos[0]; metod userRepo.manager.getRepository(AdminUser) kullanır.
      (repos[0] as unknown as { manager: unknown }).manager = {
        getRepository: jest.fn(() => adminRepo),
      };

      const result = await service.listAssignableAuctioneers();

      expect(result.code).toBe(RC.SUCCESS);
      expect(result.items.map((i) => i.id)).toEqual(['a1', 'a3']);
    });
  });
});
