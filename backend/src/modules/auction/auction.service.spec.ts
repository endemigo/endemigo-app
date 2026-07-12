import { Test, TestingModule } from '@nestjs/testing';
import { AuctionService } from './auction.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { DataSource } from 'typeorm';
import { Auction } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { WalletHold } from '../wallet/entities/wallet-hold.entity';
import { AuctionGateway } from './auction.gateway';
import { WalletService } from '../wallet/wallet.service';
import { UserService } from '../user/user.service';
import { OrderService } from '../order/order.service';
import {
  AuctionPaymentStatus,
  RC,
  AuctionApprovalStatus,
  AuctionRegistrationStatus,
  AuctionEventStatus,
  AuctionEventSystemType,
  JointManagementType,
  InvitationStatus,
  ProductStatus,
} from '@endemigo/shared';
import { AuctionEvent } from './entities/auction-event.entity';
import { AuctionRegistration } from './entities/auction-registration.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { AuctionStatus } from '../../shared/types/auction-status.enum';
import { PaymentService } from '../payment/payment.service';
import { AuctionType } from '../../shared/types/auction-type.enum';
import { BidStatus } from '../../shared/types/bid-status.enum';
import { HoldStatus } from '../../shared/types/hold-status.enum';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

type MockAuctionRepository = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  count: jest.Mock;
  createQueryBuilder: jest.Mock;
  manager: {
    findOne: jest.Mock;
    query: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
};

type MockBidRepository = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  createQueryBuilder: jest.Mock;
};

type MockWalletService = {
  getBalance: jest.Mock;
  createHold: jest.Mock;
  releaseHold: jest.Mock;
  captureHold: jest.Mock;
  releaseAllHoldsForAuction: jest.Mock;
};

type MockUserService = {
  findById: jest.Mock;
  getSellerProfile: jest.Mock;
  acceptPreContract: jest.Mock;
};

type MockOrderService = {
  createFromAuction: jest.Mock;
};

type MockAuctionQueue = {
  add: jest.Mock;
  getJob: jest.Mock;
};

type MockAuctionGateway = {
  emitBidNew: jest.Mock;
  emitBidWithdrawn: jest.Mock;
  emitBidOutbid: jest.Mock;
  emitAuctionStarted: jest.Mock;
  emitAuctionExtended: jest.Mock;
  emitAuctionWarning: jest.Mock;
  emitAuctionEnded: jest.Mock;
  emitBidWinner: jest.Mock;
  emitBidLost: jest.Mock;
  emitAuctionCancelled: jest.Mock;
  clearViewerCount: jest.Mock;
  emitEventStatusChanged: jest.Mock;
  emitActiveLotChanged: jest.Mock;
  emitLotTransition: jest.Mock;
  emitEventAutoProgressChanged: jest.Mock;
};

type MockQueryRunner = {
  connect: jest.Mock;
  startTransaction: jest.Mock;
  commitTransaction: jest.Mock;
  rollbackTransaction: jest.Mock;
  release: jest.Mock;
  isTransactionActive?: boolean;
  manager: {
    findOne: jest.Mock;
    query: jest.Mock;
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

describe('AuctionService', () => {
  let service: AuctionService;
  let auctionRepo: MockAuctionRepository;
  let bidRepo: MockBidRepository;
  let registrationRepo: any;
  let walletService: MockWalletService;
  let userService: MockUserService;
  let orderService: MockOrderService;
  let auctionQueue: MockAuctionQueue;
  let auctionGateway: MockAuctionGateway;
  let mockQueryRunner: MockQueryRunner;
  let paymentService: any;
  let cartItemRepo: any;

  const mockSeller = {
    id: 'seller-1',
    isSeller: true,
    isActive: true,
    firstName: 'Ali',
    lastName: 'Veli',
  };
  const mockBuyer = {
    id: 'buyer-1',
    isSeller: false,
    isActive: true,
    firstName: 'Buyer',
    lastName: 'Test',
  };

  const createMockAuction = (overrides: Record<string, unknown> = {}) => ({
    id: 'auction-1',
    productId: 'product-1',
    sellerId: 'seller-1',
    startPrice: 1000,
    currentPrice: 1000,
    minIncrement: 100,
    reservePrice: null,
    reserveMet: false,
    auctionType: AuctionType.REALTIME,
    antiSnipingEnabled: true,
    extensionSeconds: 60,
    maxExtensions: 5,
    currentExtensions: 0,
    status: AuctionStatus.ACTIVE,
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date(Date.now() + 86400000),
    winnerId: null,
    winnerPaymentStatus: AuctionPaymentStatus.NONE,
    winnerPaymentDeadlineAt: null,
    winnerPaymentCompletedAt: null,
    winningBidId: null,
    orderId: null,
    fallbackRound: 0,
    paymentAttemptCount: 0,
    bidCount: 0,
    lotNumber: 'LOT-202604-00001',
    culturalAssetRestricted: false,
    product: { title: 'Test', imageUrl: null },
    seller: mockSeller,
    winner: null,
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    auctionRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => ({ id: 'auction-new', bidCount: 0, ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
        getCount: jest.fn().mockResolvedValue(0),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
      manager: {
        findOne: jest.fn().mockResolvedValue({
          id: 'product-1',
          sellerId: 'seller-1',
        }),
        query: jest.fn().mockResolvedValue([]), // CR-02: advisory lock mock
        save: jest.fn((entityOrTarget: unknown, maybeEntity?: unknown) =>
          Promise.resolve(maybeEntity ?? entityOrTarget),
        ),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(
          (_entityClass: unknown, data: Record<string, unknown>) => ({
            id: `new-${Date.now()}`,
            ...data,
          }),
        ),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    bidRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn((data) => ({
        id: 'bid-new',
        createdAt: new Date(),
        ...data,
      })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      }),
    };

    walletService = {
      getBalance: jest
        .fn()
        .mockResolvedValue({ balance: 10000, held: 0, available: 10000 }),
      createHold: jest
        .fn()
        .mockResolvedValue({ id: 'hold-1', status: HoldStatus.HELD }),
      releaseHold: jest.fn().mockResolvedValue(null),
      captureHold: jest
        .fn()
        .mockResolvedValue({ id: 'hold-1', status: 'captured' }),
      releaseAllHoldsForAuction: jest.fn().mockResolvedValue(undefined),
    };

    userService = {
      findById: jest.fn().mockResolvedValue(mockBuyer),
      getSellerProfile: jest.fn().mockResolvedValue({
        sellerProfile: {
          independentPreContractAcceptedAt: new Date(),
          jointPreContractAcceptedAt: new Date(),
        },
      }),
      acceptPreContract: jest.fn(),
    };

    orderService = {
      createFromAuction: jest
        .fn()
        .mockResolvedValue({ order: { id: 'order-1' } }),
    };

    registrationRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'reg-1',
        userId: 'buyer-1',
        status: AuctionRegistrationStatus.APPROVED,
      }),
      create: jest.fn((data) => ({ id: 'reg-new', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    auctionQueue = {
      add: jest.fn().mockResolvedValue({}),
      getJob: jest.fn().mockResolvedValue(null),
    };

    auctionGateway = {
      emitBidNew: jest.fn(),
      emitBidWithdrawn: jest.fn(),
      emitBidOutbid: jest.fn(),
      emitAuctionStarted: jest.fn(),
      emitAuctionExtended: jest.fn(),
      emitAuctionWarning: jest.fn(),
      emitAuctionEnded: jest.fn(),
      emitBidWinner: jest.fn(),
      emitBidLost: jest.fn(),
      emitAuctionCancelled: jest.fn(),
      clearViewerCount: jest.fn(),
      emitEventStatusChanged: jest.fn(),
      emitActiveLotChanged: jest.fn(),
      emitLotTransition: jest.fn(),
      emitEventAutoProgressChanged: jest.fn(),
    };

    paymentService = {
      listSavedCards: jest.fn().mockResolvedValue({ cards: [] }),
      registerCard: jest
        .fn()
        .mockResolvedValue({ code: 'SUCCESS', message: 'Verified' }),
      payDeposit: jest.fn(),
    };

    cartItemRepo = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn((data) => ({ id: 'cart-item-new', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    // Mock queryRunner for transaction-based placeBid
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      isTransactionActive: true,
      manager: {
        findOne: jest.fn(),
        query: jest.fn().mockResolvedValue([]),
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
        }),
        create: jest.fn(
          (_entityClass: unknown, data: Record<string, unknown>) => ({
            id: `new-${Date.now()}`,
            createdAt: new Date(),
            ...data,
          }),
        ),
        find: jest.fn().mockResolvedValue([]),
        save: jest.fn((entityOrTarget: unknown, maybeEntity?: unknown) =>
          Promise.resolve(maybeEntity ?? entityOrTarget),
        ),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({ affected: 0 }),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionService,
        { provide: getRepositoryToken(Auction), useValue: auctionRepo },
        { provide: getRepositoryToken(Bid), useValue: bidRepo },
        {
          provide: getRepositoryToken(AuctionRegistration),
          useValue: registrationRepo,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuctionGateway, useValue: auctionGateway },
        { provide: WalletService, useValue: walletService },
        { provide: UserService, useValue: userService },
        { provide: OrderService, useValue: orderService },
        { provide: getQueueToken('auction'), useValue: auctionQueue },
        { provide: PaymentService, useValue: paymentService },
        { provide: getRepositoryToken(CartItem), useValue: cartItemRepo },
      ],
    }).compile();

    service = module.get<AuctionService>(AuctionService);
  });

  // ══════════════════════════════════════════════════════
  // Create (D-18: DRAFT)
  // ══════════════════════════════════════════════════════
  describe('create', () => {
    it('seller müzayede DRAFT olarak oluşturmalı', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      auctionRepo.findOne.mockResolvedValue(createMockAuction());

      const result = await service.create('seller-1', {
        productId: 'product-1',
        startPrice: 1000,
        startTime: '2026-04-08T10:00:00Z',
        endTime: '2026-04-08T12:00:00Z',
      });

      expect(auctionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuctionStatus.DRAFT }),
      );
      // D-18: NO BullMQ jobs in DRAFT
      expect(auctionQueue.add).not.toHaveBeenCalled();
    });

    it('DTO defaults doğru uygulanmalı', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      auctionRepo.findOne.mockResolvedValue(createMockAuction());

      await service.create('seller-1', {
        productId: 'product-1',
        startPrice: 1000,
        startTime: '2026-04-08T10:00:00Z',
        endTime: '2026-04-08T12:00:00Z',
      });

      expect(auctionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          auctionType: AuctionType.REALTIME,
          antiSnipingEnabled: true,
          extensionSeconds: 60,
          maxExtensions: 5,
        }),
      );
    });

    it('reserve price verilirse auction kaydina yazmali', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      auctionRepo.findOne.mockResolvedValue(createMockAuction());

      await service.create('seller-1', {
        productId: 'product-1',
        startPrice: 1000,
        reservePrice: 1800,
        startTime: '2026-04-08T10:00:00Z',
        endTime: '2026-04-08T12:00:00Z',
      });

      expect(auctionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reservePrice: 1800,
          reserveMet: false,
        }),
      );
    });

    it('non-seller → ForbiddenException', async () => {
      userService.findById.mockResolvedValue(mockBuyer);
      await expect(
        service.create('buyer-1', {
          productId: 'product-1',
          startPrice: 1000,
          startTime: '2026-04-08T10:00:00Z',
          endTime: '2026-04-08T12:00:00Z',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('endTime <= startTime → BadRequestException', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      await expect(
        service.create('seller-1', {
          productId: 'product-1',
          startPrice: 1000,
          startTime: '2026-04-08T12:00:00Z',
          endTime: '2026-04-08T10:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('LOT numarası LOT-YYYYMM-XXXXX formatında olmalı', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      auctionRepo.findOne.mockResolvedValue(createMockAuction());

      await service.create('seller-1', {
        productId: 'product-1',
        startPrice: 1000,
        startTime: '2026-04-08T10:00:00Z',
        endTime: '2026-04-08T12:00:00Z',
      });

      expect(auctionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lotNumber: expect.stringMatching(/^LOT-\d{6}-\d{5}$/),
        }),
      );
    });

    it('LOT üretimi ve auction kaydı aynı transaction içinde yapılmalı', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      auctionRepo.findOne.mockResolvedValue(createMockAuction());

      await service.create('seller-1', {
        productId: 'product-1',
        startPrice: 1000,
        startTime: '2026-04-08T10:00:00Z',
        endTime: '2026-04-08T12:00:00Z',
      });

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('pg_advisory_xact_lock'),
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        Auction,
        expect.objectContaining({
          lotNumber: expect.stringMatching(/^LOT-\d{6}-\d{5}$/),
        }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════
  // Publish (D-18: DRAFT → PUBLISHED)
  // ══════════════════════════════════════════════════════
  describe('publishAuction', () => {
    it('DRAFT → PUBLISHED + BullMQ jobs', async () => {
      auctionRepo.findOne
        .mockResolvedValueOnce(
          createMockAuction({
            status: AuctionStatus.DRAFT,
            startTime: new Date(Date.now() + 3600000),
          }),
        )
        .mockResolvedValue(
          createMockAuction({ status: AuctionStatus.PUBLISHED }),
        );

      await service.publishAuction('auction-1', 'seller-1');

      expect(auctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuctionStatus.PUBLISHED }),
      );
      expect(auctionQueue.add).toHaveBeenCalledTimes(2); // start + end
    });

    it('non-DRAFT → BadRequestException', async () => {
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({ status: AuctionStatus.ACTIVE }),
      );
      await expect(
        service.publishAuction('auction-1', 'seller-1'),
      ).rejects.toThrow('Sadece taslak müzayedeler yayınlanabilir');
    });

    it('non-owner → ForbiddenException', async () => {
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({ status: AuctionStatus.DRAFT }),
      );
      await expect(
        service.publishAuction('auction-1', 'buyer-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ══════════════════════════════════════════════════════
  // PlaceBid — Transaction Lock (D-02)
  // ══════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════
  // Absentee (Ön Teklif) — AUCT-ABS
  // ══════════════════════════════════════════════════════
  describe('absentee bids (AUCT-ABS)', () => {
    beforeEach(() => {
      (mockQueryRunner as any).query = jest.fn().mockResolvedValue([]);
      mockQueryRunner.manager.update = jest.fn().mockResolvedValue({});
    });

    const createAbsenteeBid = (overrides: Record<string, unknown> = {}) => ({
      id: 'bid-abs',
      auctionId: 'auction-1',
      bidderId: 'buyer-1',
      amount: 1100,
      maxAmount: 2000,
      status: BidStatus.ABSENTEE,
      isWinningBid: false,
      createdAt: new Date(Date.now() - 2000),
      ...overrides,
    });

    it('PUBLISHED + startTime öncesi teklif ABSENTEE kaydedilmeli (hold yok, fiyat sabit)', async () => {
      const auction = createMockAuction({
        status: AuctionStatus.PUBLISHED,
        startTime: new Date(Date.now() + 3600000),
      });
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(auction);

      const result = await service.placeBid('auction-1', 'buyer-1', {
        amount: 1100,
        maxAmount: 2000,
      });

      expect(result.bid.absentee).toBe(true);
      expect(result.bid.isLeadingBid).toBe(false);
      expect(result.auction.currentPrice).toBe(1000);
      expect(walletService.createHold).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: BidStatus.ABSENTEE,
          maxAmount: 2000,
          isWinningBid: false,
        }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('yeni ön teklif eskisini CANCELLED yapmalı (bidder başına tek absentee)', async () => {
      const auction = createMockAuction({
        status: AuctionStatus.PUBLISHED,
        startTime: new Date(Date.now() + 3600000),
      });
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(auction);

      await service.placeBid('auction-1', 'buyer-1', {
        amount: 1100,
        maxAmount: 2500,
      });

      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        Bid,
        {
          auctionId: 'auction-1',
          bidderId: 'buyer-1',
          status: BidStatus.ABSENTEE,
        },
        { status: BidStatus.CANCELLED },
      );
    });

    it('resolveAbsenteeBids — en yüksek max kazanmalı, görünür fiyat ikinci max + artış olmalı', async () => {
      const auction = createMockAuction({ status: AuctionStatus.ACTIVE });
      const bidHigh = createAbsenteeBid({ id: 'bid-high' });
      const bidLow = createAbsenteeBid({
        id: 'bid-low',
        bidderId: 'buyer-2',
        maxAmount: 1500,
        createdAt: new Date(Date.now() - 1000),
      });

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction) // lock auction
        .mockResolvedValueOnce(null); // previous lead
      mockQueryRunner.manager.find.mockResolvedValueOnce([bidHigh, bidLow]);

      await service.resolveAbsenteeBids('auction-1');

      // min(2000, max(1100, 1100, 1500 + 100)) = 1600 — hold açılmaz (depozit modeli)
      expect(walletService.createHold).not.toHaveBeenCalled();
      expect(bidHigh.status).toBe(BidStatus.ACTIVE);
      expect(bidHigh.isWinningBid).toBe(true);
      expect(bidHigh.amount).toBe(1600);
      expect(bidLow.status).toBe(BidStatus.OUTBID);
      expect(auction.currentPrice).toBe(1600);
      expect(auction.bidCount).toBe(2);
      expect(auctionGateway.emitBidNew).toHaveBeenCalled();
      expect(auctionGateway.emitBidOutbid).toHaveBeenCalledWith(
        'auction-1',
        'buyer-2',
        expect.objectContaining({ newAmount: 1600 }),
        undefined,
      );
    });

    it('resolveAbsenteeBids — tek ön teklif açılış fiyatından liderliğe geçmeli', async () => {
      const auction = createMockAuction({ status: AuctionStatus.ACTIVE });
      const bid = createAbsenteeBid();

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(null);
      mockQueryRunner.manager.find.mockResolvedValueOnce([bid]);

      await service.resolveAbsenteeBids('auction-1');

      // Rakip yok: min(2000, max(1100, 1100)) = 1100 — hold açılmaz
      expect(walletService.createHold).not.toHaveBeenCalled();
      expect(auction.currentPrice).toBe(1100);
      expect(bid.isWinningBid).toBe(true);
    });

    it('resolveAbsenteeBids — bakiye kontrolü yapılmaz; en yüksek max doğrudan kazanmalı', async () => {
      const auction = createMockAuction({ status: AuctionStatus.ACTIVE });
      const bidHigh = createAbsenteeBid({ id: 'bid-high' });
      const bidLow = createAbsenteeBid({
        id: 'bid-low',
        bidderId: 'buyer-2',
        maxAmount: 1500,
      });

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(null);
      mockQueryRunner.manager.find.mockResolvedValueOnce([bidHigh, bidLow]);

      await service.resolveAbsenteeBids('auction-1');

      // Depozit modeli: cüzdan bakiyesine bakılmaz, EXPIRED düşme yolu yok.
      expect(bidHigh.status).toBe(BidStatus.ACTIVE);
      expect(bidHigh.isWinningBid).toBe(true);
      expect(bidLow.status).toBe(BidStatus.OUTBID);
      expect(walletService.createHold).not.toHaveBeenCalled();
      expect(walletService.releaseHold).not.toHaveBeenCalled();
    });

    it('resolveAbsenteeBids — absentee yoksa hiçbir şey yapılmamalı', async () => {
      const auction = createMockAuction({ status: AuctionStatus.ACTIVE });
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(auction);
      mockQueryRunner.manager.find.mockResolvedValueOnce([]);

      await service.resolveAbsenteeBids('auction-1');

      expect(walletService.createHold).not.toHaveBeenCalled();
      expect(auctionGateway.emitBidNew).not.toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('withdrawBid — başlamamış müzayedede ön teklif iptal edilebilmeli', async () => {
      const auction = createMockAuction({
        status: AuctionStatus.PUBLISHED,
        startTime: new Date(Date.now() + 3600000),
      });
      const absenteeBid = createAbsenteeBid();
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(absenteeBid);

      const result = await service.withdrawBid('auction-1', 'buyer-1');

      expect(absenteeBid.status).toBe(BidStatus.CANCELLED);
      expect(result.bidId).toBe('bid-abs');
      expect(walletService.releaseHold).not.toHaveBeenCalled();
    });

    it('activateAuction — PUBLISHED → ACTIVE ve absentee çözümlemesi tetiklenmeli', async () => {
      const auction = createMockAuction({ status: AuctionStatus.PUBLISHED });
      auctionRepo.findOne.mockResolvedValue(auction);
      const resolveSpy = jest
        .spyOn(service, 'resolveAbsenteeBids')
        .mockResolvedValue(undefined);

      const result = await service.activateAuction('auction-1');

      expect(auction.status).toBe(AuctionStatus.ACTIVE);
      expect(resolveSpy).toHaveBeenCalledWith('auction-1');
      expect(result).toBeDefined();
    });
  });

  describe('placeBid', () => {
    const setupBidTransaction = (
      auctionOverrides: Record<string, unknown> = {},
    ) => {
      const auction = createMockAuction(auctionOverrides);

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction) // 1. Lock auction
        .mockResolvedValueOnce(null) // 2. Previous lead bid
        .mockResolvedValueOnce(null) // 3. Existing hold for bidder
        .mockResolvedValueOnce({
          // 4. Wallet
          id: 'wallet-1',
          userId: 'buyer-1',
          balance: 10000,
          heldAmount: 0,
        });

      userService.findById.mockResolvedValue(mockBuyer);
      return auction;
    };

    it('geçerli teklif — transaction commit', async () => {
      setupBidTransaction();

      const result = await service.placeBid('auction-1', 'buyer-1', {
        amount: 1100,
      });

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result.bid.amount).toBe(1100);
      expect(result.bid.estimatedTotal).toBe(1100);
    });

    it('max bid verilirse maxAmount saklanmali ve hold acilmamali (depozit modeli)', async () => {
      setupBidTransaction();

      const result = await service.placeBid('auction-1', 'buyer-1', {
        amount: 1100,
        maxAmount: 1600,
      });

      expect(walletService.createHold).not.toHaveBeenCalled();
      expect(result.bid.maxAmount).toBe(1600);
      expect(result.bid.isLeadingBid).toBe(true);
    });

    it('dusuk max bid mevcut lideri gecemiyorsa proxy ile otomatik gecilmeli', async () => {
      const auction = createMockAuction({
        currentPrice: 1200,
        bidCount: 1,
      });
      const previousBid = {
        id: 'prev-bid',
        bidderId: 'buyer-2',
        amount: 1200,
        maxAmount: 1600,
        isWinningBid: true,
        status: BidStatus.ACTIVE,
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(previousBid);

      userService.findById.mockResolvedValue(mockBuyer);
      const result = await service.placeBid('auction-1', 'buyer-1', {
        amount: 1300,
        maxAmount: 1400,
      });

      expect(walletService.releaseHold).not.toHaveBeenCalled();
      expect(walletService.createHold).not.toHaveBeenCalled();
      expect(result.bid.isLeadingBid).toBe(false);
      expect(result.bid.estimatedTotal).toBe(1400);
      expect(result.auction.currentPrice).toBe(1500);
      expect(result.auction.leadingBidderId).toBe('buyer-2');
    });

    it('pessimistic_write lock kullanılmalı', async () => {
      setupBidTransaction();
      await service.placeBid('auction-1', 'buyer-1', { amount: 1100 });

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(
        Auction,
        expect.objectContaining({
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });

    it('teklif akışında hiçbir cüzdan hold işlemi yapılmamalı (depozit modeli)', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(createMockAuction())
        .mockResolvedValueOnce(null);

      await service.placeBid('auction-1', 'buyer-1', { amount: 1100 });

      expect(walletService.releaseHold).not.toHaveBeenCalled();
      expect(walletService.createHold).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.create).not.toHaveBeenCalledWith(
        WalletHold,
        expect.anything(),
      );
    });

    it('rollback on error', async () => {
      mockQueryRunner.manager.findOne.mockRejectedValue(new Error('DB down'));

      await expect(
        service.placeBid('auction-1', 'buyer-1', { amount: 1100 }),
      ).rejects.toThrow('DB down');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('nonexistent auction → NotFoundException', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.placeBid('auction-1', 'buyer-1', { amount: 1100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('non-ACTIVE → BadRequest', async () => {
      setupBidTransaction({ status: AuctionStatus.ENDED });

      await expect(
        service.placeBid('auction-1', 'buyer-1', { amount: 1100 }),
      ).rejects.toThrow('Müzayede aktif değil');
    });

    it('endTime geçmiş → BadRequest (D-16)', async () => {
      setupBidTransaction({ endTime: new Date(Date.now() - 1000) });

      await expect(
        service.placeBid('auction-1', 'buyer-1', { amount: 1100 }),
      ).rejects.toThrow('Müzayede sona erdi');
    });

    it('self-bid → BadRequest', async () => {
      setupBidTransaction();

      await expect(
        service.placeBid('auction-1', 'seller-1', { amount: 1100 }),
      ).rejects.toThrow('Kendi müzayedenize teklif veremezsiniz');
    });

    it('min increment altı → BadRequest', async () => {
      setupBidTransaction();

      await expect(
        service.placeBid('auction-1', 'buyer-1', { amount: 1050 }),
      ).rejects.toThrow(/Minimum teklif/);
    });

    it('cüzdan bakiyesi yetersiz olsa bile teklif kabul edilmeli (bakiye kontrolü yok)', async () => {
      const auction = createMockAuction();
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(null);
      walletService.getBalance.mockResolvedValue({
        balance: 0,
        held: 0,
        available: 0,
      });

      const result = await service.placeBid('auction-1', 'buyer-1', {
        amount: 1100,
      });

      expect(result.bid.amount).toBe(1100);
      expect(walletService.createHold).not.toHaveBeenCalled();
    });

    it('previous bid OUTBID olarak işaretlenmeli (BIZ-12)', async () => {
      const auction = createMockAuction();
      const previousBid = {
        id: 'prev-bid',
        bidderId: 'buyer-2',
        amount: 1000,
        isWinningBid: true,
        status: BidStatus.ACTIVE,
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(previousBid) // Previous lead bid
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'wallet-1',
          userId: 'buyer-1',
          balance: 10000,
          heldAmount: 0,
        });

      userService.findById.mockResolvedValue(mockBuyer);
      await service.placeBid('auction-1', 'buyer-1', { amount: 1100 });

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'prev-bid',
          status: BidStatus.OUTBID,
          isWinningBid: false,
        }),
      );
    });

    it('önceki lider geçilse bile hold serbest bırakma işlemi yapılmamalı', async () => {
      const auction = createMockAuction();
      const previousBid = {
        id: 'prev-bid',
        bidderId: 'buyer-2',
        amount: 1000,
        isWinningBid: true,
        status: BidStatus.ACTIVE,
      };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(previousBid);

      userService.findById.mockResolvedValue(mockBuyer);
      await service.placeBid('auction-1', 'buyer-1', { amount: 1100 });

      expect(walletService.releaseHold).not.toHaveBeenCalled();
    });

    it('aynı kullanıcı teklif artırınca da hold işlemi olmamalı', async () => {
      const auction = createMockAuction();
      const previousBid = {
        id: 'prev-bid',
        bidderId: 'buyer-1',
        amount: 1000,
        isWinningBid: true,
        status: BidStatus.ACTIVE,
      };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(previousBid);

      userService.findById.mockResolvedValue(mockBuyer);
      await service.placeBid('auction-1', 'buyer-1', { amount: 1100 });

      expect(walletService.releaseHold).not.toHaveBeenCalled();
      expect(walletService.createHold).not.toHaveBeenCalled();
    });

    it('gateway bid:new ve bid:outbid event emitlenmeli', async () => {
      const previousBid = {
        id: 'prev-bid',
        bidderId: 'buyer-2',
        amount: 1000,
        isWinningBid: true,
        status: BidStatus.ACTIVE,
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(createMockAuction())
        .mockResolvedValueOnce(previousBid)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'wallet-1',
          userId: 'buyer-1',
          balance: 10000,
          heldAmount: 0,
        });

      userService.findById.mockResolvedValue(mockBuyer);
      await service.placeBid('auction-1', 'buyer-1', { amount: 1100 });

      expect(auctionGateway.emitBidNew).toHaveBeenCalledWith(
        'auction-1',
        expect.objectContaining({ amount: 1100 }),
        undefined,
      );
      expect(auctionGateway.emitBidOutbid).toHaveBeenCalledWith(
        'auction-1',
        'buyer-2',
        expect.objectContaining({ newAmount: 1100, yourBid: 1000 }),
        undefined,
      );
    });

    it('kaydı yoksa → ForbiddenException fırlatmalı (RC.AUCTION_REGISTRATION_REQUIRED)', async () => {
      setupBidTransaction();
      registrationRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.placeBid('auction-1', 'buyer-1', { amount: 1100 }),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: RC.AUCTION_REGISTRATION_REQUIRED,
          }),
        }),
      );
    });

    it('kaydı PENDING durumundaysa → ForbiddenException fırlatmalı (RC.AUCTION_REGISTRATION_REQUIRED)', async () => {
      setupBidTransaction();
      registrationRepo.findOne.mockResolvedValueOnce({
        id: 'reg-1',
        userId: 'buyer-1',
        status: AuctionRegistrationStatus.PENDING,
      });

      await expect(
        service.placeBid('auction-1', 'buyer-1', { amount: 1100 }),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: RC.AUCTION_REGISTRATION_REQUIRED,
            message: 'Müzayede katılım onayınız bekleniyor',
          }),
        }),
      );
    });

    it('biddingLimit yetersiz ise -> ForbiddenException fırlatmalı (BIDDING_LIMIT_EXCEEDED)', async () => {
      setupBidTransaction();

      userService.findById.mockResolvedValueOnce({
        ...mockBuyer,
        biddingLimit: 50000,
        totalDeposit: 0,
      });

      mockQueryRunner.manager.find.mockResolvedValueOnce([]); // wonUnpaid
      mockQueryRunner.manager.find.mockResolvedValueOnce([]); // activeLeading

      await expect(
        service.placeBid('auction-1', 'buyer-1', { amount: 60000 }),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: 'BIDDING_LIMIT_EXCEEDED',
            currentLimit: 50000,
            requiredLimit: 60000,
            // requiredDeposit = totalRisk * 0.20 - totalDeposit = 60000 * 0.2 - 0
            requiredDeposit: 12000,
          }),
        }),
      );
    });

    it('biddingLimit yeterli ise -> teklif başarıyla verilmeli', async () => {
      setupBidTransaction();

      userService.findById.mockResolvedValueOnce({
        ...mockBuyer,
        biddingLimit: 100000,
        totalDeposit: 10000,
      });

      mockQueryRunner.manager.find.mockResolvedValueOnce([]); // wonUnpaid
      mockQueryRunner.manager.find.mockResolvedValueOnce([]); // activeLeading

      registrationRepo.findOne.mockResolvedValueOnce({
        id: 'reg-1',
        userId: 'buyer-1',
        status: AuctionRegistrationStatus.APPROVED,
      });

      const result = await service.placeBid('auction-1', 'buyer-1', {
        amount: 60000,
      });
      expect(result.bid.amount).toBe(60000);
    });
  });

  // ══════════════════════════════════════════════════════
  // Anti-Sniping (D-03, D-10)
  // ══════════════════════════════════════════════════════
  describe('anti-sniping', () => {
    it('son 60s içinde teklif → süre uzamalı', async () => {
      const endTime = new Date(Date.now() + 30000); // 30s left
      const auction = createMockAuction({ endTime, currentExtensions: 0 });

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'wallet-1',
          userId: 'buyer-1',
          balance: 10000,
          heldAmount: 0,
        });

      userService.findById.mockResolvedValue(mockBuyer);
      const result = await service.placeBid('auction-1', 'buyer-1', {
        amount: 1100,
      });

      expect(result.antiSniping!.extended).toBe(true);
      expect(result.antiSniping!.extensionSeconds).toBe(60); // İlk uzatma
    });

    it('pencere dışında teklif → uzatma yok', async () => {
      const endTime = new Date(Date.now() + 120000); // 2 min left (>60s window)
      const auction = createMockAuction({ endTime, currentExtensions: 0 });

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'wallet-1',
          userId: 'buyer-1',
          balance: 10000,
          heldAmount: 0,
        });

      userService.findById.mockResolvedValue(mockBuyer);
      const result = await service.placeBid('auction-1', 'buyer-1', {
        amount: 1100,
      });

      expect(result.antiSniping!.extended).toBe(false);
    });

    it('her uzatmada sabit süre eklenmeli (kademesiz)', async () => {
      const endTime = new Date(Date.now() + 30000);
      const auction = createMockAuction({ endTime, currentExtensions: 2 }); // 3. uzatma

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'wallet-1',
          userId: 'buyer-1',
          balance: 10000,
          heldAmount: 0,
        });

      userService.findById.mockResolvedValue(mockBuyer);
      const result = await service.placeBid('auction-1', 'buyer-1', {
        amount: 1100,
      });

      expect(result.antiSniping!.extensionSeconds).toBe(60); // Kademe olmadığı için hep varsayılan 60s
    });

    it('maxExtensions ulaşıldıysa uzatma yok', async () => {
      const endTime = new Date(Date.now() + 30000);
      const auction = createMockAuction({
        endTime,
        currentExtensions: 5,
        maxExtensions: 5,
      });

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'wallet-1',
          userId: 'buyer-1',
          balance: 10000,
          heldAmount: 0,
        });

      userService.findById.mockResolvedValue(mockBuyer);
      const result = await service.placeBid('auction-1', 'buyer-1', {
        amount: 1100,
      });

      expect(result.antiSniping!.extended).toBe(false);
    });

    it('antiSniping disabled → uzatma yok', async () => {
      const endTime = new Date(Date.now() + 30000);
      const auction = createMockAuction({
        endTime,
        antiSnipingEnabled: false,
      });

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'wallet-1',
          userId: 'buyer-1',
          balance: 10000,
          heldAmount: 0,
        });

      userService.findById.mockResolvedValue(mockBuyer);
      const result = await service.placeBid('auction-1', 'buyer-1', {
        amount: 1100,
      });

      expect(result.antiSniping!.extended).toBe(false);
    });

    it('dinamik uzatma süresi → extensionDuration kadar uzamalı', async () => {
      const endTime = new Date(Date.now() + 30000); // 30s left
      const auction = createMockAuction({
        endTime,
        currentExtensions: 0,
        extensionDuration: 40,
      });

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'wallet-1',
          userId: 'buyer-1',
          balance: 10000,
          heldAmount: 0,
        });

      userService.findById.mockResolvedValue(mockBuyer);
      const result = await service.placeBid('auction-1', 'buyer-1', {
        amount: 1100,
      });

      expect(result.antiSniping!.extended).toBe(true);
      expect(result.antiSniping!.extensionSeconds).toBe(40);
    });

    it('Timed auction → 120s uzatma (AUCT-T-03)', async () => {
      const endTime = new Date(Date.now() + 30000);
      const auction = createMockAuction({
        endTime,
        auctionType: AuctionType.TIMED,
        currentExtensions: 0,
      });

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'wallet-1',
          userId: 'buyer-1',
          balance: 10000,
          heldAmount: 0,
        });

      userService.findById.mockResolvedValue(mockBuyer);
      const result = await service.placeBid('auction-1', 'buyer-1', {
        amount: 1100,
      });

      expect(result.antiSniping!.extensionSeconds).toBe(120);
    });

    it('Timed auction max 3 uzatma', async () => {
      const endTime = new Date(Date.now() + 30000);
      const auction = createMockAuction({
        endTime,
        auctionType: AuctionType.TIMED,
        currentExtensions: 3,
        maxExtensions: 3,
      });

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'wallet-1',
          userId: 'buyer-1',
          balance: 10000,
          heldAmount: 0,
        });

      userService.findById.mockResolvedValue(mockBuyer);
      const result = await service.placeBid('auction-1', 'buyer-1', {
        amount: 1100,
      });

      expect(result.antiSniping!.extended).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════
  // Finalize (D-11, BIZ-12)
  // ══════════════════════════════════════════════════════
  describe('finalizeAuction', () => {
    it('teklif yoksa FAILED (D-11)', async () => {
      const auction = createMockAuction({
        bidCount: 0,
        endTime: new Date(Date.now() - 1000),
      });
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(auction);

      await service.finalizeAuction('auction-1');

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuctionStatus.FAILED }),
      );
      expect(auctionGateway.emitAuctionEnded).toHaveBeenCalledWith(
        'auction-1',
        expect.objectContaining({ winnerId: null, bidCount: 0 }),
      );
      expect(auctionGateway.clearViewerCount).toHaveBeenCalledWith('auction-1');
    });

    it('kazanan bid WON, diğerleri OUTBID (BIZ-12)', async () => {
      const auction = createMockAuction({
        bidCount: 3,
        endTime: new Date(Date.now() - 1000),
      });
      const winningBid = {
        id: 'winning-bid',
        bidderId: 'buyer-1',
        amount: 1500,
        status: BidStatus.ACTIVE,
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction) // lock auction
        .mockResolvedValueOnce(winningBid); // winning bid

      // Mock createQueryBuilder for bulk OUTBID update
      mockQueryRunner.manager.createQueryBuilder = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      });

      await service.finalizeAuction('auction-1');

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'winning-bid',
          status: BidStatus.WON,
          isWinningBid: true,
        }),
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          winnerId: 'buyer-1',
          winnerPaymentStatus: AuctionPaymentStatus.PENDING,
          winningBidId: 'winning-bid',
          // Ödeme penceresi approveSale ile açılır — finalize'da deadline yok
          winnerPaymentDeadlineAt: null,
          saleApprovedAt: null,
          saleApprovedBy: null,
        }),
      );
      expect(mockQueryRunner.manager.createQueryBuilder).toHaveBeenCalled();
    });

    it('sadece aktif lider teklifi kazanan secer; iptal/expired teklifleri dislar', async () => {
      const auction = createMockAuction({
        bidCount: 3,
        endTime: new Date(Date.now() - 1000),
      });
      const activeLeader = {
        id: 'active-leader',
        bidderId: 'buyer-1',
        amount: 1500,
        status: BidStatus.ACTIVE,
        isWinningBid: true,
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(activeLeader);
      mockQueryRunner.manager.createQueryBuilder = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      });

      await service.finalizeAuction('auction-1');

      expect(mockQueryRunner.manager.findOne).toHaveBeenNthCalledWith(
        2,
        Bid,
        expect.objectContaining({
          where: expect.objectContaining({
            auctionId: 'auction-1',
            status: BidStatus.ACTIVE,
            isWinningBid: true,
          }),
        }),
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          winnerId: 'buyer-1',
          winningBidId: 'active-leader',
        }),
      );
    });

    it('gateway events emitlenmeli', async () => {
      const auction = createMockAuction({
        bidCount: 2,
        endTime: new Date(Date.now() - 1000),
      });
      const winningBid = {
        id: 'winning-bid',
        bidderId: 'buyer-1',
        amount: 1200,
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(winningBid);

      mockQueryRunner.manager.createQueryBuilder = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      });

      await service.finalizeAuction('auction-1');

      expect(auctionGateway.emitAuctionEnded).toHaveBeenCalled();
      expect(auctionGateway.emitBidWinner).toHaveBeenCalledWith(
        'auction-1',
        'buyer-1',
        expect.objectContaining({ finalPrice: 1200 }),
      );
      // Losers are notified with the winner id so the gateway can target them.
      expect(auctionGateway.emitBidLost).toHaveBeenCalledWith(
        'auction-1',
        'buyer-1',
        expect.objectContaining({ finalPrice: 1200, holdReleased: false }),
        undefined,
      );
      expect(auctionGateway.clearViewerCount).toHaveBeenCalledWith('auction-1');
    });

    it('post-commit side-effect failure schedules compensation without rollback', async () => {
      const auction = createMockAuction({
        bidCount: 2,
        endTime: new Date(Date.now() - 1000),
      });
      const winningBid = {
        id: 'winning-bid',
        bidderId: 'buyer-1',
        amount: 1200,
      };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(winningBid);
      mockQueryRunner.manager.createQueryBuilder = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      });
      auctionGateway.emitBidWinner.mockImplementationOnce(() => {
        throw new Error('gateway down');
      });

      await expect(service.finalizeAuction('auction-1')).rejects.toThrow(
        'gateway down',
      );

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(auctionQueue.add).toHaveBeenCalledWith(
        'auction-finalization-compensation',
        expect.objectContaining({ auctionId: 'auction-1' }),
        expect.objectContaining({ attempts: 5 }),
      );
    });

    it('ENDED müzayedeyi tekrar finalize etmemeli', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(
        createMockAuction({ status: AuctionStatus.ENDED }),
      );
      await service.finalizeAuction('auction-1');
      expect(auctionGateway.emitAuctionEnded).not.toHaveBeenCalled();
    });

    it('reserve price karsilanmadiysa FAILED olmali ve kazanan olusmamali', async () => {
      const auction = createMockAuction({
        reservePrice: 2000,
        reserveMet: false,
        bidCount: 2,
        endTime: new Date(Date.now() - 1000),
      });
      const winningBid = {
        id: 'winning-bid',
        bidderId: 'buyer-1',
        amount: 1500,
        maxAmount: 1800,
        status: BidStatus.ACTIVE,
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(winningBid);

      await service.finalizeAuction('auction-1');

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuctionStatus.FAILED,
          winnerId: null,
        }),
      );
      expect(walletService.releaseAllHoldsForAuction).not.toHaveBeenCalled();
      expect(auctionGateway.emitBidWinner).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════
  // Cancel (D-08)
  // ══════════════════════════════════════════════════════
  describe('cancelAuction', () => {
    it('teklif yoksa iptal edilebilir', async () => {
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({ status: AuctionStatus.PUBLISHED, bidCount: 0 }),
      );

      const result = await service.cancelAuction('auction-1', 'seller-1');

      expect(auctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuctionStatus.CANCELLED }),
      );
      expect(auctionGateway.emitAuctionCancelled).toHaveBeenCalled();
    });

    it('teklif varsa → BadRequest', async () => {
      auctionRepo.findOne.mockResolvedValue(createMockAuction({ bidCount: 3 }));

      await expect(
        service.cancelAuction('auction-1', 'seller-1'),
      ).rejects.toThrow(/admin tarafından/);
    });
  });

  describe('adminCancelAuction', () => {
    it('aktif ve teklifli müzayedeyi hold/iş/sepet temizliğiyle iptal etmeli', async () => {
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({
          status: AuctionStatus.ACTIVE,
          bidCount: 3,
          currentExtensions: 2,
        }),
      );

      const result = await service.adminCancelAuction(
        'auction-1',
        'Şüpheli işlem',
      );

      expect(auctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuctionStatus.CANCELLED,
          winnerId: null,
          winnerPaymentStatus: AuctionPaymentStatus.NONE,
        }),
      );
      expect(bidRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ auctionId: 'auction-1' }),
        { status: BidStatus.CANCELLED },
      );
      expect(walletService.releaseAllHoldsForAuction).toHaveBeenCalledWith(
        'auction-1',
      );
      expect(cartItemRepo.delete).toHaveBeenCalledWith({
        auctionId: 'auction-1',
      });
      expect(auctionQueue.getJob).toHaveBeenCalledWith('start-auction-1');
      expect(auctionQueue.getJob).toHaveBeenCalledWith('end-auction-1');
      expect(auctionQueue.getJob).toHaveBeenCalledWith('end-auction-1-ext1');
      expect(auctionQueue.getJob).toHaveBeenCalledWith('end-auction-1-ext2');
      expect(auctionGateway.emitAuctionCancelled).toHaveBeenCalledWith(
        'auction-1',
        {
          reason: 'Şüpheli işlem',
        },
      );
      expect(auctionGateway.clearViewerCount).toHaveBeenCalledWith('auction-1');
      expect(result.code).toBe(RC.AUCTION_CANCELLED);
    });

    it('ödeme bekleyen müzayedede kazanan alanlarını ve ödeme işlerini temizlemeli', async () => {
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({
          status: AuctionStatus.ENDED,
          bidCount: 5,
          winnerId: 'buyer-1',
          winningBidId: 'bid-1',
          winnerPaymentStatus: AuctionPaymentStatus.PENDING,
          winnerPaymentDeadlineAt: new Date(),
          fallbackRound: 1,
        }),
      );

      await service.adminCancelAuction('auction-1');

      expect(auctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuctionStatus.CANCELLED,
          winnerId: null,
          winningBidId: null,
          winnerPaymentStatus: AuctionPaymentStatus.NONE,
          winnerPaymentDeadlineAt: null,
        }),
      );
      expect(auctionQueue.getJob).toHaveBeenCalledWith(
        'winner-payment-expiry-auction-1-r1',
      );
      expect(auctionQueue.getJob).toHaveBeenCalledWith(
        'winner-payment-reminder-auction-1-r1',
      );
      expect(cartItemRepo.delete).toHaveBeenCalledWith({
        auctionId: 'auction-1',
      });
      expect(walletService.releaseAllHoldsForAuction).toHaveBeenCalledWith(
        'auction-1',
      );
    });

    it('COMPLETED müzayede iptal edilememeli', async () => {
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({ status: AuctionStatus.COMPLETED }),
      );

      await expect(service.adminCancelAuction('auction-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(walletService.releaseAllHoldsForAuction).not.toHaveBeenCalled();
    });
  });

  describe('adminFinalizeAuction', () => {
    it('aktif müzayedede endTime öne çekilip finalize zorlanmalı', async () => {
      const auction = createMockAuction({
        status: AuctionStatus.ACTIVE,
        endTime: new Date(Date.now() + 3600000),
        currentExtensions: 1,
      });
      auctionRepo.findOne.mockResolvedValue(auction);
      const finalizeSpy = jest
        .spyOn(service, 'finalizeAuction')
        .mockResolvedValue(
          createMockAuction({ status: AuctionStatus.ENDED }) as never,
        );

      const result = await service.adminFinalizeAuction('auction-1');

      expect(auctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'auction-1' }),
      );
      expect(auction.endTime.getTime()).toBeLessThan(Date.now());
      expect(auctionQueue.getJob).toHaveBeenCalledWith('end-auction-1');
      expect(auctionQueue.getJob).toHaveBeenCalledWith('end-auction-1-ext1');
      expect(finalizeSpy).toHaveBeenCalledWith('auction-1', true);
      expect(result.code).toBe(RC.SUCCESS);
    });

    it('ACTIVE olmayan müzayede sonlandırılamamalı', async () => {
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({ status: AuctionStatus.ENDED }),
      );

      await expect(service.adminFinalizeAuction('auction-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('finalize sonuç dönmezse hata fırlatmalı', async () => {
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({
          status: AuctionStatus.ACTIVE,
          endTime: new Date(Date.now() - 5000),
        }),
      );
      jest
        .spyOn(service, 'finalizeAuction')
        .mockResolvedValue(undefined as never);

      await expect(service.adminFinalizeAuction('auction-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('pause/resume kalıcılığı (DB)', () => {
    const mockEvent = (overrides: Record<string, unknown> = {}) => ({
      id: 'event-1',
      status: AuctionEventStatus.ACTIVE,
      activeLotId: 'auction-1',
      autoProgressEnabled: true,
      ...overrides,
    });

    it('pauseAuction kalan süreyi lot satırına yazmalı', async () => {
      auctionRepo.manager.findOne.mockResolvedValueOnce(mockEvent());
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({
          status: AuctionStatus.ACTIVE,
          endTime: new Date(Date.now() + 90000),
        }),
      );

      await service.pauseAuction('event-1');

      expect(auctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuctionStatus.PUBLISHED,
          pausedRemainingSeconds: expect.any(Number),
        }),
      );
      const savedLot = auctionRepo.save.mock.calls[0][0];
      expect(savedLot.pausedRemainingSeconds).toBeGreaterThan(80);
      expect(auctionGateway.emitEventStatusChanged).toHaveBeenCalledWith(
        'event-1',
        {
          status: 'PAUSED',
        },
      );
    });

    it('resumeAuction süreyi lot satırından okuyup temizlemeli', async () => {
      auctionRepo.manager.findOne.mockResolvedValueOnce(mockEvent());
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({
          status: AuctionStatus.PUBLISHED,
          pausedRemainingSeconds: 42,
        }),
      );

      await service.resumeAuction('event-1');

      expect(auctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuctionStatus.ACTIVE,
          pausedRemainingSeconds: null,
        }),
      );
      expect(auctionQueue.add).toHaveBeenCalledWith(
        'end-auction',
        { auctionId: 'auction-1' },
        expect.objectContaining({ delay: 42000, jobId: 'end-auction-1' }),
      );
    });

    it('setAutoProgress bayrağı event satırına yazmalı', async () => {
      auctionRepo.manager.findOne.mockResolvedValueOnce(mockEvent());

      const result = await service.setAutoProgress('event-1', false);

      expect(auctionRepo.manager.update).toHaveBeenCalledWith(
        expect.anything(),
        'event-1',
        { autoProgressEnabled: false },
      );
      expect(auctionGateway.emitEventAutoProgressChanged).toHaveBeenCalledWith(
        'event-1',
        false,
      );
      expect(result.enabled).toBe(false);
    });

    it('isAutoProgressEnabled event satırındaki değeri okumalı', async () => {
      auctionRepo.manager.findOne.mockResolvedValueOnce(
        mockEvent({ autoProgressEnabled: false }),
      );

      await expect(service.isAutoProgressEnabled('event-1')).resolves.toBe(
        false,
      );
    });
  });

  describe('withdrawBid', () => {
    it('kendi aktif lider teklifi tek teklifse geri cekebilmeli', async () => {
      const auction = createMockAuction({
        currentPrice: 1500,
        bidCount: 1,
      });
      const activeBid = {
        id: 'bid-leading',
        auctionId: 'auction-1',
        bidderId: 'buyer-1',
        amount: 1500,
        status: BidStatus.ACTIVE,
        isWinningBid: true,
        createdAt: new Date(),
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(activeBid)
        .mockResolvedValueOnce(null);

      const result = await service.withdrawBid('auction-1', 'buyer-1');

      expect(walletService.releaseHold).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'bid-leading',
          status: BidStatus.CANCELLED,
          isWinningBid: false,
        }),
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'auction-1',
          currentPrice: 1000,
          bidCount: 0,
        }),
      );
      expect(result.code).toBe('BID_WITHDRAWN');
    });

    it('rekabete girmis lider teklif geri cekilememeli', async () => {
      const auction = createMockAuction({
        currentPrice: 1700,
        bidCount: 2,
      });
      const activeBid = {
        id: 'bid-leading',
        auctionId: 'auction-1',
        bidderId: 'buyer-1',
        amount: 1700,
        status: BidStatus.ACTIVE,
        isWinningBid: true,
        createdAt: new Date(),
      };
      const previousBid = {
        id: 'bid-previous',
        auctionId: 'auction-1',
        bidderId: 'buyer-2',
        amount: 1500,
        status: BidStatus.OUTBID,
        isWinningBid: false,
        createdAt: new Date(),
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(activeBid)
        .mockResolvedValueOnce(previousBid);

      await expect(service.withdrawBid('auction-1', 'buyer-1')).rejects.toThrow(
        /geri cekilemez/,
      );
      expect(walletService.releaseHold).not.toHaveBeenCalled();
    });
  });

  describe('completeWinnerPayment', () => {
    const createApprovedAuction = (overrides: Record<string, unknown> = {}) =>
      createMockAuction({
        status: AuctionStatus.ENDED,
        winnerId: 'buyer-1',
        winningBidId: 'winning-bid',
        winnerPaymentStatus: AuctionPaymentStatus.PENDING,
        saleApprovedAt: new Date(Date.now() - 60_000),
        saleApprovedBy: 'admin-1',
        winnerPaymentDeadlineAt: new Date(Date.now() + 60_000),
        ...overrides,
      });

    const winningBid = {
      id: 'winning-bid',
      auctionId: 'auction-1',
      bidderId: 'buyer-1',
      amount: 1800,
    };

    it('onaylı satışta sepette ödeme kalemini garanti edip cart yönlendirmesi dönmeli', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(createApprovedAuction())
        .mockResolvedValueOnce(winningBid)
        .mockResolvedValueOnce(null); // sepette mevcut kalem yok

      const result = await service.completeWinnerPayment(
        'auction-1',
        'buyer-1',
      );

      // Cüzdan/hold ve order akışı tamamen kaldırıldı
      expect(walletService.captureHold).not.toHaveBeenCalled();
      expect(walletService.releaseAllHoldsForAuction).not.toHaveBeenCalled();
      expect(orderService.createFromAuction).not.toHaveBeenCalled();

      // Eksik sepet kalemi oluşturulmalı
      expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(CartItem, {
        userId: 'buyer-1',
        productId: 'product-1',
      });
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'buyer-1',
          productId: 'product-1',
          auctionId: 'auction-1',
          customPrice: 1800,
          quantity: 1,
        }),
      );

      expect(result).toMatchObject({
        code: RC.SUCCESS,
        paymentVia: 'cart',
        amount: 1800,
        paymentStatus: AuctionPaymentStatus.PENDING,
      });
    });

    it('sepette kalem zaten varsa yeni kalem eklenmemeli', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(createApprovedAuction())
        .mockResolvedValueOnce(winningBid)
        .mockResolvedValueOnce({ id: 'cart-item-1' });

      const result = await service.completeWinnerPayment(
        'auction-1',
        'buyer-1',
      );

      expect(mockQueryRunner.manager.delete).not.toHaveBeenCalled();
      expect(result).toMatchObject({ code: RC.SUCCESS, paymentVia: 'cart' });
    });

    it('satış onayı yoksa -> BadRequest fırlatmalı', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(
        createApprovedAuction({
          saleApprovedAt: null,
          saleApprovedBy: null,
          winnerPaymentDeadlineAt: null,
        }),
      );

      await expect(
        service.completeWinnerPayment('auction-1', 'buyer-1'),
      ).rejects.toThrow(/Satış henüz onaylanmadı/);
    });

    it('ödeme süresi dolduysa -> BadRequest fırlatmalı', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(
        createApprovedAuction({
          winnerPaymentDeadlineAt: new Date(Date.now() - 1_000),
        }),
      );

      await expect(
        service.completeWinnerPayment('auction-1', 'buyer-1'),
      ).rejects.toThrow(/Odeme suresi doldu/);
    });
  });

  describe('processWinnerPaymentExpiry', () => {
    it('uygun fallback bidder varsa yeni kazanan atamali', async () => {
      const auction = createMockAuction({
        status: AuctionStatus.ENDED,
        winnerId: 'buyer-1',
        winningBidId: 'winning-bid',
        winnerPaymentStatus: AuctionPaymentStatus.PENDING,
        winnerPaymentDeadlineAt: new Date(Date.now() - 1_000),
      });
      const winningBid = {
        id: 'winning-bid',
        auctionId: 'auction-1',
        bidderId: 'buyer-1',
        amount: 2000,
        status: BidStatus.WON,
        isWinningBid: true,
      };
      const fallbackBid = {
        id: 'fallback-bid',
        auctionId: 'auction-1',
        bidderId: 'buyer-2',
        amount: 1800,
        maxAmount: 1900,
        status: BidStatus.OUTBID,
        isWinningBid: false,
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(winningBid);
      mockQueryRunner.manager.find.mockResolvedValueOnce([
        winningBid,
        fallbackBid,
      ]);

      const result = await service.processWinnerPaymentExpiry('auction-1');

      // Fallback ataması cüzdan/bakiye kontrolü olmadan yapılır
      expect(walletService.releaseHold).not.toHaveBeenCalled();
      expect(walletService.createHold).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        winnerId: 'buyer-2',
      });
      expect(auctionGateway.emitBidWinner).toHaveBeenCalledWith(
        'auction-1',
        'buyer-2',
        expect.objectContaining({ finalPrice: 1800 }),
      );
    });

    it('fallback yoksa muzayedeyi FAILED kapatmali', async () => {
      const auction = createMockAuction({
        status: AuctionStatus.ENDED,
        winnerId: 'buyer-1',
        winningBidId: 'winning-bid',
        winnerPaymentStatus: AuctionPaymentStatus.PENDING,
        winnerPaymentDeadlineAt: new Date(Date.now() - 1_000),
        fallbackRound: 1,
      });
      const winningBid = {
        id: 'winning-bid',
        auctionId: 'auction-1',
        bidderId: 'buyer-1',
        amount: 2000,
        status: BidStatus.WON,
        isWinningBid: true,
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(winningBid);

      const result = await service.processWinnerPaymentExpiry('auction-1');

      expect(result).toMatchObject({ winnerId: null });
      expect(auctionGateway.emitAuctionEnded).toHaveBeenCalledWith(
        'auction-1',
        expect.objectContaining({ winnerId: null }),
      );
    });
  });

  // ══════════════════════════════════════════════════════
  // approveSale (satış onayı → ödeme penceresi)
  // ══════════════════════════════════════════════════════
  describe('approveSale', () => {
    const createEndedAuction = (overrides: Record<string, unknown> = {}) =>
      createMockAuction({
        status: AuctionStatus.ENDED,
        winnerId: 'buyer-1',
        winningBidId: 'winning-bid',
        winnerPaymentStatus: AuctionPaymentStatus.PENDING,
        saleApprovedAt: null,
        saleApprovedBy: null,
        winnerPaymentDeadlineAt: null,
        ...overrides,
      });

    it('happy path: onay alanlarını doldurup sepete ekleyip ödeme işlerini planlamalı', async () => {
      auctionRepo.findOne.mockResolvedValueOnce(createEndedAuction());
      bidRepo.findOne.mockResolvedValueOnce({
        id: 'winning-bid',
        auctionId: 'auction-1',
        bidderId: 'buyer-1',
        amount: 1800,
      });

      const before = Date.now();
      const result = await service.approveSale('auction-1', 'admin-1');

      expect(auctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          saleApprovedAt: expect.any(Date),
          saleApprovedBy: 'admin-1',
          winnerPaymentDeadlineAt: expect.any(Date),
        }),
      );

      // Deadline onay anından itibaren +24 saat kurulmalı
      const savedAuction = auctionRepo.save.mock.calls[0][0];
      const deadlineMs = savedAuction.winnerPaymentDeadlineAt.getTime();
      expect(deadlineMs).toBeGreaterThanOrEqual(
        before + 24 * 60 * 60 * 1000 - 5000,
      );
      expect(deadlineMs).toBeLessThanOrEqual(
        Date.now() + 24 * 60 * 60 * 1000 + 5000,
      );

      // Kazanılan ürün sepete düşer (varsa eski kalem silinir)
      expect(cartItemRepo.delete).toHaveBeenCalledWith({
        userId: 'buyer-1',
        productId: 'product-1',
      });
      expect(cartItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'buyer-1',
          productId: 'product-1',
          auctionId: 'auction-1',
          customPrice: 1800,
          quantity: 1,
        }),
      );

      // Ödeme süresi işleri planlanmalı
      expect(auctionQueue.add).toHaveBeenCalledWith(
        'winner-payment-expiry',
        { auctionId: 'auction-1' },
        expect.objectContaining({
          jobId: 'winner-payment-expiry-auction-1-r0',
        }),
      );
      expect(auctionQueue.add).toHaveBeenCalledWith(
        'winner-payment-reminder',
        { auctionId: 'auction-1' },
        expect.objectContaining({
          jobId: 'winner-payment-reminder-auction-1-r0',
        }),
      );

      expect(result).toMatchObject({
        code: RC.SUCCESS,
        auctionId: 'auction-1',
        saleApprovedAt: expect.any(Date),
        winnerPaymentDeadlineAt: expect.any(Date),
      });
    });

    it('ENDED olmayan müzayede için -> BadRequest fırlatmalı', async () => {
      auctionRepo.findOne.mockResolvedValueOnce(
        createEndedAuction({ status: AuctionStatus.ACTIVE }),
      );

      await expect(service.approveSale('auction-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(auctionRepo.save).not.toHaveBeenCalled();
    });

    it('kazananı olmayan müzayede için -> BadRequest fırlatmalı', async () => {
      auctionRepo.findOne.mockResolvedValueOnce(
        createEndedAuction({ winnerId: null, winningBidId: null }),
      );

      await expect(service.approveSale('auction-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ikinci çağrı idempotent olmalı (Satış zaten onaylanmış)', async () => {
      const approvedAt = new Date(Date.now() - 60_000);
      auctionRepo.findOne.mockResolvedValueOnce(
        createEndedAuction({
          saleApprovedAt: approvedAt,
          saleApprovedBy: 'admin-1',
        }),
      );

      const result = await service.approveSale('auction-1', 'admin-2');

      expect(result).toMatchObject({
        code: RC.SUCCESS,
        message: 'Satış zaten onaylanmış',
        saleApprovedAt: approvedAt,
      });
      expect(auctionRepo.save).not.toHaveBeenCalled();
      expect(cartItemRepo.save).not.toHaveBeenCalled();
      expect(auctionQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('approveEventSales', () => {
    it('etkinlikteki biten lotların her biri için approveSale çağırmalı', async () => {
      auctionRepo.find.mockResolvedValueOnce([
        { id: 'lot-1' },
        { id: 'lot-2' },
      ]);
      const approveSpy = jest
        .spyOn(service, 'approveSale')
        .mockResolvedValue({ code: RC.SUCCESS } as never);

      const result = await service.approveEventSales('event-1', 'admin-1');

      expect(auctionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventId: 'event-1',
            status: AuctionStatus.ENDED,
            winnerPaymentStatus: AuctionPaymentStatus.PENDING,
          }),
        }),
      );
      expect(approveSpy).toHaveBeenCalledWith('lot-1', 'admin-1');
      expect(approveSpy).toHaveBeenCalledWith('lot-2', 'admin-1');
      expect(result.code).toBe(RC.SUCCESS);
      expect(result.results).toEqual([
        { auctionId: 'lot-1', approved: true },
        { auctionId: 'lot-2', approved: true },
      ]);
    });

    it('bir lot onaylanamazsa diğerleri etkilenmemeli', async () => {
      auctionRepo.find.mockResolvedValueOnce([
        { id: 'lot-1' },
        { id: 'lot-2' },
      ]);
      jest
        .spyOn(service, 'approveSale')
        .mockRejectedValueOnce(new Error('onay hatası'))
        .mockResolvedValueOnce({ code: RC.SUCCESS } as never);

      const result = await service.approveEventSales('event-1');

      expect(result.results).toEqual([
        { auctionId: 'lot-1', approved: false, error: 'onay hatası' },
        { auctionId: 'lot-2', approved: true },
      ]);
    });
  });

  // ══════════════════════════════════════════════════════
  // findById
  // ══════════════════════════════════════════════════════
  describe('findById', () => {
    it('olmayan müzayede → NotFoundException', async () => {
      auctionRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('toResponse tüm alanları döndürmeli (BIZ-24)', async () => {
      auctionRepo.findOne.mockResolvedValue(createMockAuction());
      const result = await service.findById('auction-1');

      expect(result).toHaveProperty('lotNumber');
      expect(result).toHaveProperty('auctionType');
      expect(result).toHaveProperty('reservePrice');
      expect(result).toHaveProperty('reserveMet');
      expect(result).toHaveProperty('antiSnipingEnabled');
      expect(result).toHaveProperty('serverTime');
      expect(result).toHaveProperty('timeLeftMs');
      expect(result).toHaveProperty('culturalAssetRestricted');
      expect(result).toHaveProperty('winnerPaymentStatus');
      expect(result).toHaveProperty('winnerPaymentDeadlineAt');
    });
  });

  describe('getBids', () => {
    it('teklif listesinde maxAmount bilgisini donmeli', async () => {
      bidRepo.find.mockResolvedValue([
        {
          id: 'bid-1',
          amount: 1500,
          maxAmount: 1800,
          status: BidStatus.ACTIVE,
          isWinningBid: true,
          bidder: mockBuyer,
          createdAt: new Date('2026-05-18T09:00:00.000Z'),
        },
      ]);

      const result = await service.getBids('auction-1');

      expect(result.code).toBeDefined();
      expect(result.bids[0]).toMatchObject({
        id: 'bid-1',
        amount: 1500,
        maxAmount: 1800,
      });
    });
  });

  describe('getResult', () => {
    it('reserve alanlarini ve kazanan yoksa sifir buyer premium donmeli', async () => {
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({
          status: AuctionStatus.FAILED,
          bidCount: 2,
          currentPrice: 1700,
          reservePrice: 2000,
          reserveMet: false,
          winnerId: null,
          winner: null,
        }),
      );

      const result = await service.getResult('auction-1');

      expect(result).toMatchObject({
        status: AuctionStatus.FAILED,
        reservePrice: 2000,
        reserveMet: false,
        buyerPremium: 0,
        winner: null,
        paymentStatus: AuctionPaymentStatus.NONE,
      });
    });
  });

  describe('applyToEvent', () => {
    const mockDto = {
      productId: 'product-1',
      startPrice: 100,
      reservePrice: 150,
      durationHours: 24,
      antiSnipingEnabled: true,
      extensionSeconds: 60,
      maxExtensions: 3,
      minIncrement: 10,
      guaranteeAccepted: true,
    };

    it('should throw ForbiddenException if user is not a seller', async () => {
      userService.findById.mockResolvedValue({
        id: 'buyer-1',
        isSeller: false,
      });

      await expect(
        service.applyToEvent('buyer-1', 'event-1', mockDto as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if event does not exist', async () => {
      userService.findById.mockResolvedValue({
        id: 'seller-1',
        isSeller: true,
      });
      auctionRepo.manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.applyToEvent('seller-1', 'event-1', mockDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if event is not APPLICATION', async () => {
      userService.findById.mockResolvedValue({
        id: 'seller-1',
        isSeller: true,
      });
      auctionRepo.manager.findOne.mockResolvedValueOnce({
        id: 'event-1',
        eventType: AuctionEventSystemType.ENDEMIGO_MANAGED,
        status: 'ACTIVE',
        submissionDeadline: null,
      });

      await expect(
        service.applyToEvent('seller-1', 'event-1', mockDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if submission deadline has passed', async () => {
      userService.findById.mockResolvedValue({
        id: 'seller-1',
        isSeller: true,
      });
      auctionRepo.manager.findOne.mockResolvedValueOnce({
        id: 'event-1',
        eventType: AuctionEventSystemType.ENDEMIGO_MANAGED,
        status: 'APPLICATION',
        submissionDeadline: new Date(Date.now() - 10000), // passed
      });

      await expect(
        service.applyToEvent('seller-1', 'event-1', mockDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should apply successfully if deadline is in the future', async () => {
      userService.findById.mockResolvedValue({
        id: 'seller-1',
        isSeller: true,
      });
      auctionRepo.manager.findOne
        .mockResolvedValueOnce({
          id: 'event-1',
          eventType: AuctionEventSystemType.ENDEMIGO_MANAGED,
          status: 'APPLICATION',
          submissionDeadline: new Date(Date.now() + 100000), // future
        })
        .mockResolvedValueOnce({
          id: 'product-1',
          sellerId: 'seller-1',
        });

      auctionRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      auctionRepo.create.mockReturnValue({ id: 'auction-1' });
      auctionRepo.save.mockResolvedValue({ id: 'auction-1' });

      const result = await service.applyToEvent(
        'seller-1',
        'event-1',
        mockDto as any,
      );
      expect(result).toBeDefined();
    });
  });

  describe('organizerApproveLot', () => {
    it('ürün içerik onayından geçmeden (ACTIVE) organizatör lotu onaylayamaz', async () => {
      auctionRepo.manager.findOne.mockResolvedValueOnce({
        id: 'event-1',
        ownerId: 'seller-1',
        eventType: AuctionEventSystemType.JOINT,
      });
      auctionRepo.findOne.mockResolvedValueOnce({
        id: 'lot-1',
        eventId: 'event-1',
        sellerId: 'seller-2',
        approvalStatus: AuctionApprovalStatus.PENDING,
        product: { title: 'X', status: ProductStatus.PENDING_REVIEW },
      });

      await expect(
        service.organizerApproveLot(
          'event-1',
          'lot-1',
          'seller-1',
          AuctionApprovalStatus.APPROVED,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findEventDetails', () => {
    it('olmayan etkinlik → NotFoundException', async () => {
      auctionRepo.manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.findEventDetails('nonexistent-event'),
      ).rejects.toThrow(NotFoundException);
    });

    it('etkinlik varsa approved lotlari sequenceNumber sırasıyla döndürmeli', async () => {
      const mockEvent = {
        id: 'event-1',
        title: 'Halı Kilim Müzayedesi',
        status: 'ACTIVE',
      };
      const mockLot1 = createMockAuction({
        id: 'lot-1',
        eventId: 'event-1',
        sequenceNumber: 1,
        approvalStatus: AuctionApprovalStatus.APPROVED,
        product: { title: 'Halı 1', imageUrl: null },
      });
      const mockLot2 = createMockAuction({
        id: 'lot-2',
        eventId: 'event-1',
        sequenceNumber: 2,
        approvalStatus: AuctionApprovalStatus.APPROVED,
        product: { title: 'Kilim 1', imageUrl: null },
      });

      auctionRepo.manager.findOne.mockResolvedValueOnce(mockEvent);
      auctionRepo.find.mockResolvedValueOnce([mockLot1, mockLot2]);

      const result = await service.findEventDetails('event-1');

      expect(auctionRepo.manager.findOne).toHaveBeenCalledWith(
        AuctionEvent,
        expect.objectContaining({ where: { id: 'event-1' } }),
      );
      expect(auctionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            eventId: 'event-1',
            approvalStatus: AuctionApprovalStatus.APPROVED,
          },
          relations: ['product', 'seller'],
          order: { sequenceNumber: 'ASC' },
        }),
      );

      expect(result.code).toBe(RC.SUCCESS);
      expect(result.event).toEqual(mockEvent);
      expect(result.lots).toHaveLength(2);
      expect(result.lots[0].id).toBe('lot-1');
      expect(result.lots[1].id).toBe('lot-2');
    });
  });

  describe('Auction Registration Flow', () => {
    describe('registerToAuction', () => {
      it('müzayede yoksa -> NotFoundException fırlatmalı', async () => {
        auctionRepo.findOne.mockResolvedValueOnce(null);
        await expect(
          service.registerToAuction('buyer-1', 'nonexistent'),
        ).rejects.toThrow(NotFoundException);
      });

      it('kullanıcı devre dışıysa -> ForbiddenException fırlatmalı', async () => {
        auctionRepo.findOne.mockResolvedValueOnce(createMockAuction());
        userService.findById.mockResolvedValueOnce({
          id: 'buyer-1',
          isActive: false,
        });
        await expect(
          service.registerToAuction('buyer-1', 'auction-1'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('zaten APPROVED kaydı varsa -> mevcut kaydı dönmeli', async () => {
        const mockAuction = createMockAuction();
        const mockReg = {
          id: 'reg-1',
          userId: 'buyer-1',
          status: AuctionRegistrationStatus.APPROVED,
        };
        auctionRepo.findOne.mockResolvedValueOnce(mockAuction);
        userService.findById.mockResolvedValueOnce(mockBuyer);
        registrationRepo.findOne.mockResolvedValueOnce(mockReg);

        const result = await service.registerToAuction('buyer-1', 'auction-1');
        expect(result.code).toBe(RC.SUCCESS);
        expect(result.registration).toEqual(mockReg);
      });

      it('kart bilgileri ve kayıtlı kart yoksa -> BadRequestException fırlatmalı', async () => {
        const mockAuction = createMockAuction();
        auctionRepo.findOne.mockResolvedValueOnce(mockAuction);
        userService.findById.mockResolvedValueOnce(mockBuyer);
        registrationRepo.findOne.mockResolvedValueOnce(null);
        paymentService.listSavedCards.mockResolvedValueOnce({ cards: [] });

        await expect(
          service.registerToAuction('buyer-1', 'auction-1'),
        ).rejects.toThrow(BadRequestException);
      });

      it('kayıtlı kartı varsa -> PENDING olarak kaydetmeli', async () => {
        const mockAuction = createMockAuction();
        auctionRepo.findOne.mockResolvedValueOnce(mockAuction);
        userService.findById.mockResolvedValueOnce(mockBuyer);
        registrationRepo.findOne.mockResolvedValueOnce(null);
        paymentService.listSavedCards.mockResolvedValueOnce({
          cards: [{ id: 'card-1' }],
        });

        const result = await service.registerToAuction('buyer-1', 'auction-1');
        expect(registrationRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            status: AuctionRegistrationStatus.APPROVED,
          }),
        );
        expect(result.code).toBe(RC.SUCCESS);
        expect(result.registration.status).toBe(
          AuctionRegistrationStatus.APPROVED,
        );
      });

      it('kayıtlı kartı yok ama kart bilgisi gönderdiyse -> kartı doğrulayıp APPROVED yapmalı', async () => {
        const mockAuction = createMockAuction();
        auctionRepo.findOne.mockResolvedValueOnce(mockAuction);
        userService.findById.mockResolvedValueOnce(mockBuyer);
        registrationRepo.findOne.mockResolvedValueOnce(null);
        paymentService.listSavedCards.mockResolvedValueOnce({ cards: [] });

        const result = await service.registerToAuction('buyer-1', 'auction-1', {
          cardHolderName: 'John Doe',
          cardNumber: '4111111111111111',
          expireMonth: '12',
          expireYear: '2028',
          cvc: '123',
        });
        expect(paymentService.registerCard).toHaveBeenCalled();
        expect(result.code).toBe(RC.SUCCESS);
        expect(result.registration.status).toBe(
          AuctionRegistrationStatus.APPROVED,
        );
      });

      it('müzayede giriş depozitosu gerektiriyorsa ve ödeme başarılıysa -> APPROVED kaydetmeli', async () => {
        const mockAuction = createMockAuction({ requiredDeposit: 10000 });
        auctionRepo.findOne.mockResolvedValueOnce(mockAuction);
        userService.findById.mockResolvedValueOnce(mockBuyer);
        registrationRepo.findOne.mockResolvedValueOnce(null);
        paymentService.listSavedCards.mockResolvedValueOnce({
          cards: [{ id: 'card-1' }],
        });
        paymentService.payDeposit.mockResolvedValueOnce({ code: 'SUCCESS' });

        const result = await service.registerToAuction('buyer-1', 'auction-1');
        expect(paymentService.payDeposit).toHaveBeenCalledWith('buyer-1', {
          amount: 10000,
          cardDetails: undefined,
        });
        expect(result.code).toBe(RC.SUCCESS);
        expect(result.registration.status).toBe(
          AuctionRegistrationStatus.APPROVED,
        );
      });

      it('kültür varlığı kısıtlı lotta -> PENDING kalmalı (elle onay)', async () => {
        const mockAuction = createMockAuction({
          culturalAssetRestricted: true,
        });
        auctionRepo.findOne.mockResolvedValueOnce(mockAuction);
        userService.findById.mockResolvedValueOnce(mockBuyer);
        registrationRepo.findOne.mockResolvedValueOnce(null);
        paymentService.listSavedCards.mockResolvedValueOnce({
          cards: [{ id: 'card-1' }],
        });

        const result = await service.registerToAuction('buyer-1', 'auction-1');
        expect(result.code).toBe(RC.AUCTION_REGISTRATION_PENDING);
        expect(result.registration.status).toBe(
          AuctionRegistrationStatus.PENDING,
        );
      });

      it('aktif hesap kısıtı olan kullanıcıda -> PENDING kalmalı (elle onay)', async () => {
        const mockAuction = createMockAuction();
        auctionRepo.findOne.mockResolvedValueOnce(mockAuction);
        userService.findById.mockResolvedValueOnce(mockBuyer);
        registrationRepo.findOne.mockResolvedValueOnce(null);
        paymentService.listSavedCards.mockResolvedValueOnce({
          cards: [{ id: 'card-1' }],
        });
        auctionRepo.manager.count.mockResolvedValueOnce(1);

        const result = await service.registerToAuction('buyer-1', 'auction-1');
        expect(result.code).toBe(RC.AUCTION_REGISTRATION_PENDING);
        expect(result.registration.status).toBe(
          AuctionRegistrationStatus.PENDING,
        );
      });

      it('REJECTED kaydı varsa yeniden başvuruda PENDING durumuna dönmeli', async () => {
        const mockAuction = createMockAuction();
        auctionRepo.findOne.mockResolvedValueOnce(mockAuction);
        userService.findById.mockResolvedValueOnce(mockBuyer);
        registrationRepo.findOne.mockResolvedValueOnce({
          id: 'reg-1',
          userId: 'buyer-1',
          status: AuctionRegistrationStatus.REJECTED,
        });
        paymentService.listSavedCards.mockResolvedValueOnce({
          cards: [{ id: 'card-1' }],
        });

        const result = await service.registerToAuction('buyer-1', 'auction-1');
        expect(registrationRepo.create).not.toHaveBeenCalled();
        expect(result.code).toBe(RC.AUCTION_REGISTRATION_PENDING);
        expect(result.registration.status).toBe(
          AuctionRegistrationStatus.PENDING,
        );
      });

      it('müzayede giriş depozitosu gerektiriyorsa ve ödeme başarısızsa -> BadRequestException fırlatmalı', async () => {
        const mockAuction = createMockAuction({ requiredDeposit: 10000 });
        auctionRepo.findOne.mockResolvedValueOnce(mockAuction);
        userService.findById.mockResolvedValueOnce(mockBuyer);
        registrationRepo.findOne.mockResolvedValueOnce(null);
        paymentService.listSavedCards.mockResolvedValueOnce({
          cards: [{ id: 'card-1' }],
        });
        paymentService.payDeposit.mockRejectedValueOnce(
          new Error('Kredi kartı limiti yetersiz'),
        );

        await expect(
          service.registerToAuction('buyer-1', 'auction-1'),
        ).rejects.toThrow(BadRequestException);
        expect(paymentService.payDeposit).toHaveBeenCalled();
      });
    });

    describe('getRegistrationStatus', () => {
      it('kayıt varsa -> durumu dönmeli', async () => {
        auctionRepo.findOne.mockResolvedValueOnce(createMockAuction());
        const mockReg = {
          id: 'reg-1',
          userId: 'buyer-1',
          status: AuctionRegistrationStatus.APPROVED,
        };
        registrationRepo.findOne.mockResolvedValueOnce(mockReg);

        const result = await service.getRegistrationStatus(
          'buyer-1',
          'auction-1',
        );
        expect(result.code).toBe(RC.AUCTION_REGISTRATION_STATUS);
        expect(result.registration).toEqual(mockReg);
      });
    });

    describe('listRegistrationsForAdmin', () => {
      it('admin için katılım taleplerini listelemeli', async () => {
        const mockRegs = [
          { id: 'reg-1', status: AuctionRegistrationStatus.PENDING },
        ];
        const qb = registrationRepo.createQueryBuilder();
        qb.getManyAndCount.mockResolvedValueOnce([mockRegs, 1]);

        const result = await service.listRegistrationsForAdmin(
          AuctionRegistrationStatus.PENDING,
          1,
          20,
        );
        expect(result.code).toBe(RC.SUCCESS);
        expect(result.items).toEqual(mockRegs);
        expect(result.pagination.total).toBe(1);
      });
    });

    describe('updateRegistrationStatus', () => {
      it('olmayan kayıt -> NotFoundException fırlatmalı', async () => {
        registrationRepo.findOne.mockResolvedValueOnce(null);
        await expect(
          service.updateRegistrationStatus(
            'nonexistent',
            AuctionRegistrationStatus.APPROVED,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('onaylanırsa -> APPROVED yapmalı', async () => {
        const mockReg = {
          id: 'reg-1',
          status: AuctionRegistrationStatus.PENDING,
        };
        registrationRepo.findOne.mockResolvedValueOnce(mockReg);
        registrationRepo.save.mockImplementationOnce((entity: any) =>
          Promise.resolve(entity),
        );

        const result = await service.updateRegistrationStatus(
          'reg-1',
          AuctionRegistrationStatus.APPROVED,
        );
        expect(result.code).toBe(RC.AUCTION_REGISTRATION_APPROVED_SUCCESS);
        expect(result.registration.status).toBe(
          AuctionRegistrationStatus.APPROVED,
        );
      });

      it('reddedilirse -> REJECTED yapmalı', async () => {
        const mockReg = {
          id: 'reg-1',
          status: AuctionRegistrationStatus.PENDING,
        };
        registrationRepo.findOne.mockResolvedValueOnce(mockReg);
        registrationRepo.save.mockImplementationOnce((entity: any) =>
          Promise.resolve(entity),
        );

        const result = await service.updateRegistrationStatus(
          'reg-1',
          AuctionRegistrationStatus.REJECTED,
        );
        expect(result.code).toBe(RC.AUCTION_REGISTRATION_REJECTED_SUCCESS);
        expect(result.registration.status).toBe(
          AuctionRegistrationStatus.REJECTED,
        );
      });
    });
  });

  describe('New Auction Models and Rules', () => {
    describe('createEvent', () => {
      it('should throw BadRequest if independent pre-contract is not accepted', async () => {
        userService.getSellerProfile.mockResolvedValueOnce({
          sellerProfile: { independentPreContractAcceptedAt: null },
        });

        await expect(
          service.createEvent('seller-1', {
            title: 'Independent Event',
            startTime: '2026-06-30T10:00:00Z',
            endTime: '2026-06-30T12:00:00Z',
            eventType: AuctionEventSystemType.INDEPENDENT,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequest if joint pre-contract is not accepted', async () => {
        userService.getSellerProfile.mockResolvedValueOnce({
          sellerProfile: { jointPreContractAcceptedAt: null },
        });

        await expect(
          service.createEvent('seller-1', {
            title: 'Joint Event',
            startTime: '2026-06-30T10:00:00Z',
            endTime: '2026-06-30T12:00:00Z',
            eventType: AuctionEventSystemType.JOINT,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequest for INDEPENDENT with fewer than 40 active products', async () => {
        userService.getSellerProfile.mockResolvedValueOnce({
          sellerProfile: { independentPreContractAcceptedAt: new Date() },
        });
        auctionRepo.manager.count.mockResolvedValueOnce(39);

        await expect(
          service.createEvent('seller-1', {
            title: 'Independent Event',
            startTime: '2026-06-30T10:00:00Z',
            endTime: '2026-06-30T12:00:00Z',
            eventType: AuctionEventSystemType.INDEPENDENT,
          }),
        ).rejects.toThrow('en az 40 aktif ürün');
      });

      it('should throw BadRequest for JOINT without canCreateJoint flag', async () => {
        userService.getSellerProfile.mockResolvedValueOnce({
          sellerProfile: {
            jointPreContractAcceptedAt: new Date(),
            canCreateJoint: false,
          },
        });
        auctionRepo.manager.count.mockResolvedValueOnce(25);

        await expect(
          service.createEvent('seller-1', {
            title: 'Joint Event',
            startTime: '2026-06-30T10:00:00Z',
            endTime: '2026-06-30T12:00:00Z',
            eventType: AuctionEventSystemType.JOINT,
          }),
        ).rejects.toThrow('Ortak müzayede düzenleme yetkiniz bulunmuyor');
      });

      it('should create JOINT event when flag + 20 products present', async () => {
        userService.getSellerProfile.mockResolvedValueOnce({
          sellerProfile: {
            jointPreContractAcceptedAt: new Date(),
            canCreateJoint: true,
          },
        });
        auctionRepo.manager.count.mockResolvedValueOnce(20);
        auctionRepo.manager.save.mockResolvedValueOnce({
          id: 'event-joint',
          title: 'Joint Event',
        });

        const result = await service.createEvent('seller-1', {
          title: 'Joint Event',
          startTime: '2026-06-30T10:00:00Z',
          endTime: '2026-06-30T12:00:00Z',
          eventType: AuctionEventSystemType.JOINT,
        });

        expect(result.code).toBe(RC.SUCCESS);
      });

      it('should create event successfully if contract is accepted', async () => {
        userService.getSellerProfile.mockResolvedValueOnce({
          sellerProfile: {
            independentPreContractAcceptedAt: new Date(),
          },
        });
        // Bağımsız müzayede kapısı: en az 40 aktif ürün
        auctionRepo.manager.count.mockResolvedValueOnce(40);
        auctionRepo.manager.save.mockResolvedValueOnce({
          id: 'event-new',
          title: 'Independent Event',
        });

        const result = await service.createEvent('seller-1', {
          title: 'Independent Event',
          startTime: '2026-06-30T10:00:00Z',
          endTime: '2026-06-30T12:00:00Z',
          eventType: AuctionEventSystemType.INDEPENDENT,
        });

        expect(result.code).toBe(RC.SUCCESS);
        expect(result.event).toBeDefined();
      });
    });

    describe('submitEventForApproval', () => {
      it('should throw Forbidden if seller is not the owner', async () => {
        auctionRepo.manager.findOne.mockResolvedValueOnce({
          id: 'event-1',
          ownerId: 'seller-2',
          status: AuctionEventStatus.DRAFT,
        });

        await expect(
          service.submitEventForApproval('event-1', 'seller-1'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw BadRequest for Independent event with less than 40 lots', async () => {
        auctionRepo.manager.findOne.mockResolvedValueOnce({
          id: 'event-1',
          ownerId: 'seller-1',
          status: AuctionEventStatus.DRAFT,
          eventType: AuctionEventSystemType.INDEPENDENT,
        });
        auctionRepo.find.mockResolvedValueOnce(new Array(39).fill({}));

        await expect(
          service.submitEventForApproval('event-1', 'seller-1'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequest for Joint event with less than 60 lots', async () => {
        auctionRepo.manager.findOne.mockResolvedValueOnce({
          id: 'event-1',
          ownerId: 'seller-1',
          status: AuctionEventStatus.DRAFT,
          eventType: AuctionEventSystemType.JOINT,
        });
        auctionRepo.find.mockResolvedValueOnce(new Array(59).fill({}));

        await expect(
          service.submitEventForApproval('event-1', 'seller-1'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequest for Joint event if any seller has less than 20 lots', async () => {
        auctionRepo.manager.findOne.mockResolvedValueOnce({
          id: 'event-1',
          ownerId: 'seller-1',
          status: AuctionEventStatus.DRAFT,
          eventType: AuctionEventSystemType.JOINT,
        });
        // Total 65 lots but seller-2 contributed only 15
        const lots = [
          ...new Array(45).fill({ sellerId: 'seller-1' }),
          ...new Array(15).fill({ sellerId: 'seller-2' }),
          ...new Array(5).fill({ sellerId: 'seller-3' }),
        ];
        auctionRepo.find.mockResolvedValueOnce(lots);

        await expect(
          service.submitEventForApproval('event-1', 'seller-1'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should submit successfully if all rules are satisfied', async () => {
        auctionRepo.manager.findOne.mockResolvedValueOnce({
          id: 'event-1',
          ownerId: 'seller-1',
          status: AuctionEventStatus.DRAFT,
          eventType: AuctionEventSystemType.JOINT,
        });
        const lots = [
          ...new Array(35).fill({ sellerId: 'seller-1' }),
          ...new Array(25).fill({ sellerId: 'seller-2' }),
        ];
        auctionRepo.find.mockResolvedValueOnce(lots);
        auctionRepo.manager.save.mockImplementationOnce((_, e) =>
          Promise.resolve(e),
        );

        const result = await service.submitEventForApproval(
          'event-1',
          'seller-1',
        );
        expect(result.code).toBe(RC.SUCCESS);
        expect(result.event.status).toBe(AuctionEventStatus.APPLICATION);
      });
    });

    describe('applyToEvent validations', () => {
      it('should throw BadRequest for Endemigo-Managed if supplier exceeds 5 products limit', async () => {
        userService.findById.mockResolvedValueOnce({
          id: 'seller-1',
          isSeller: true,
        });
        auctionRepo.manager.findOne.mockResolvedValueOnce({
          id: 'event-1',
          status: AuctionEventStatus.APPLICATION,
          eventType: AuctionEventSystemType.ENDEMIGO_MANAGED,
        });
        userService.getSellerProfile.mockResolvedValueOnce({
          sellerProfile: {},
        });
        auctionRepo.count.mockResolvedValueOnce(5);

        await expect(
          service.applyToEvent('seller-1', 'event-1', {
            productId: 'product-1',
            startPrice: 100,
            guaranteeAccepted: true,
          } as any),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequest if guaranteeAccepted is false or missing', async () => {
        userService.findById.mockResolvedValueOnce({
          id: 'seller-1',
          isSeller: true,
        });
        auctionRepo.manager.findOne.mockResolvedValueOnce({
          id: 'event-1',
          status: AuctionEventStatus.APPLICATION,
          eventType: AuctionEventSystemType.ENDEMIGO_MANAGED,
        });
        userService.getSellerProfile.mockResolvedValueOnce({
          sellerProfile: {},
        });

        await expect(
          service.applyToEvent('seller-1', 'event-1', {
            productId: 'product-1',
            startPrice: 100,
          } as any),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw Forbidden for Joint if seller is not owner and has no accepted invitation', async () => {
        userService.findById.mockResolvedValueOnce({
          id: 'seller-2',
          isSeller: true,
        });
        auctionRepo.manager.findOne.mockResolvedValueOnce({
          id: 'event-1',
          ownerId: 'seller-1',
          status: AuctionEventStatus.APPLICATION,
          eventType: AuctionEventSystemType.JOINT,
        });
        userService.getSellerProfile.mockResolvedValueOnce({
          sellerProfile: { jointPreContractAcceptedAt: new Date() },
        });
        auctionRepo.manager.findOne.mockResolvedValueOnce(null);

        await expect(
          service.applyToEvent('seller-2', 'event-1', {
            productId: 'product-1',
            startPrice: 100,
            guaranteeAccepted: true,
          } as any),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('Invitations', () => {
      it('should send invitation successfully', async () => {
        auctionRepo.manager.findOne.mockResolvedValueOnce({
          id: 'event-1',
          ownerId: 'seller-1',
          eventType: AuctionEventSystemType.JOINT,
          status: AuctionEventStatus.DRAFT,
        });
        userService.findById.mockResolvedValueOnce({
          id: 'seller-2',
          isSeller: true,
        });
        auctionRepo.manager.count.mockResolvedValueOnce(25);
        auctionRepo.manager.findOne.mockResolvedValueOnce(null);
        auctionRepo.manager.create.mockReturnValue({ id: 'invite-1' });
        auctionRepo.manager.save.mockResolvedValueOnce({ id: 'invite-1' });

        const result = await service.sendInvitation(
          'event-1',
          'seller-1',
          'seller-2',
        );
        expect(result.code).toBe(RC.SUCCESS);
        expect(result.invitation).toBeDefined();
      });

      it('should throw BadRequest if invitee has less than 20 products', async () => {
        auctionRepo.manager.findOne.mockResolvedValueOnce({
          id: 'event-1',
          ownerId: 'seller-1',
          eventType: AuctionEventSystemType.JOINT,
          status: AuctionEventStatus.DRAFT,
        });
        userService.findById.mockResolvedValueOnce({
          id: 'seller-2',
          isSeller: true,
        });
        auctionRepo.manager.count.mockResolvedValueOnce(15);

        await expect(
          service.sendInvitation('event-1', 'seller-1', 'seller-2'),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });
});
