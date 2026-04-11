import { Test, TestingModule } from '@nestjs/testing';
import { AuctionService } from './auction.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { DataSource } from 'typeorm';
import { Auction } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { AuctionGateway } from './auction.gateway';
import { WalletService } from '../wallet/wallet.service';
import { UserService } from '../user/user.service';
import { AuctionStatus } from '../../shared/types/auction-status.enum';
import { AuctionType } from '../../shared/types/auction-type.enum';
import { BidStatus } from '../../shared/types/bid-status.enum';
import { HoldStatus } from '../../shared/types/hold-status.enum';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('AuctionService', () => {
  let service: AuctionService;
  let auctionRepo: any;
  let bidRepo: any;
  let walletService: any;
  let userService: any;
  let auctionQueue: any;
  let auctionGateway: any;
  let mockQueryRunner: any;

  const mockSeller = {
    id: 'seller-1',
    isSeller: true,
    firstName: 'Ali',
    lastName: 'Veli',
  };
  const mockBuyer = {
    id: 'buyer-1',
    isSeller: false,
    firstName: 'Buyer',
    lastName: 'Test',
  };

  const createMockAuction = (overrides: any = {}) => ({
    id: 'auction-1',
    productId: 'product-1',
    sellerId: 'seller-1',
    startPrice: 1000,
    currentPrice: 1000,
    minIncrement: 100,
    buyerPremiumRate: 0.25,
    auctionType: AuctionType.REALTIME,
    antiSnipingEnabled: true,
    extensionSeconds: 60,
    maxExtensions: 5,
    currentExtensions: 0,
    status: AuctionStatus.ACTIVE,
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date(Date.now() + 86400000),
    winnerId: null,
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
      },
    };

    bidRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
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
      createHold: jest.fn().mockResolvedValue({ id: 'hold-1' }),
      releaseHold: jest.fn().mockResolvedValue(null),
      captureHold: jest
        .fn()
        .mockResolvedValue({ id: 'hold-1', status: 'captured' }),
      releaseAllHoldsForAuction: jest.fn().mockResolvedValue(undefined),
    };

    userService = {
      findById: jest.fn(),
    };

    auctionQueue = {
      add: jest.fn().mockResolvedValue({}),
      getJob: jest.fn().mockResolvedValue(null),
    };

    auctionGateway = {
      emitBidNew: jest.fn(),
      emitBidOutbid: jest.fn(),
      emitAuctionStarted: jest.fn(),
      emitAuctionExtended: jest.fn(),
      emitAuctionWarning: jest.fn(),
      emitAuctionEnded: jest.fn(),
      emitBidWinner: jest.fn(),
      emitBidLost: jest.fn(),
      emitAuctionCancelled: jest.fn(),
    };

    // Mock queryRunner for transaction-based placeBid
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        create: jest.fn((EntityClass: any, data: any) => ({
          id: `new-${Date.now()}`,
          createdAt: new Date(),
          ...data,
        })),
        save: jest.fn((entity: any) => Promise.resolve(entity)),
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
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuctionGateway, useValue: auctionGateway },
        { provide: WalletService, useValue: walletService },
        { provide: UserService, useValue: userService },
        { provide: getQueueToken('auction'), useValue: auctionQueue },
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
          buyerPremiumRate: 0.25,
          auctionType: AuctionType.REALTIME,
          antiSnipingEnabled: true,
          extensionSeconds: 60,
          maxExtensions: 5,
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
        .mockResolvedValue(createMockAuction({ status: AuctionStatus.PUBLISHED }));

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
  describe('placeBid', () => {
    const setupBidTransaction = (auctionOverrides: any = {}) => {
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

    it('yetersiz bakiye → BadRequest', async () => {
      const auction = createMockAuction();
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'wallet-1',
          userId: 'buyer-1',
          balance: 500,
          heldAmount: 0,
        });

      await expect(
        service.placeBid('auction-1', 'buyer-1', { amount: 1100 }),
      ).rejects.toThrow(/Yetersiz bakiye/);
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
      );
      expect(auctionGateway.emitBidOutbid).toHaveBeenCalledWith(
        'auction-1',
        'buyer-2',
        expect.objectContaining({ newAmount: 1100, yourBid: 1000 }),
      );
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

      expect(result.antiSniping.extended).toBe(true);
      expect(result.antiSniping.extensionSeconds).toBe(60); // İlk uzatma
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

      expect(result.antiSniping.extended).toBe(false);
    });

    it('kademeli azaltma: 2. uzatma → 45s', async () => {
      const endTime = new Date(Date.now() + 30000);
      const auction = createMockAuction({ endTime, currentExtensions: 1 });

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

      expect(result.antiSniping.extensionSeconds).toBe(45);
    });

    it('kademeli azaltma: 3+ uzatma → 30s', async () => {
      const endTime = new Date(Date.now() + 30000);
      const auction = createMockAuction({ endTime, currentExtensions: 2 });

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

      expect(result.antiSniping.extensionSeconds).toBe(30);
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

      expect(result.antiSniping.extended).toBe(false);
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

      expect(result.antiSniping.extended).toBe(false);
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

      expect(result.antiSniping.extensionSeconds).toBe(120);
    });

    it('Timed auction max 3 uzatma', async () => {
      const endTime = new Date(Date.now() + 30000);
      const auction = createMockAuction({
        endTime,
        auctionType: AuctionType.TIMED,
        currentExtensions: 3,
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

      expect(result.antiSniping.extended).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════
  // Finalize (D-11, BIZ-12)
  // ══════════════════════════════════════════════════════
  describe('finalizeAuction', () => {
    it('teklif yoksa FAILED (D-11)', async () => {
      auctionRepo.findOne.mockResolvedValue(createMockAuction({ bidCount: 0 }));
      await service.finalizeAuction('auction-1');

      expect(auctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuctionStatus.FAILED }),
      );
      expect(auctionGateway.emitAuctionEnded).toHaveBeenCalledWith(
        'auction-1',
        expect.objectContaining({ winnerId: null, bidCount: 0 }),
      );
    });

    it('kazanan bid WON, diğerleri OUTBID (BIZ-12)', async () => {
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({ bidCount: 3 }),
      );
      bidRepo.findOne.mockResolvedValue({
        id: 'winning-bid',
        bidderId: 'buyer-1',
        amount: 1500,
        status: BidStatus.ACTIVE,
      });

      await service.finalizeAuction('auction-1');

      expect(bidRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'winning-bid',
          status: BidStatus.WON,
          isWinningBid: true,
        }),
      );
      expect(bidRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('gateway events emitlenmeli', async () => {
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({ bidCount: 2 }),
      );
      bidRepo.findOne.mockResolvedValue({
        id: 'winning-bid',
        bidderId: 'buyer-1',
        amount: 1200,
      });

      await service.finalizeAuction('auction-1');

      expect(auctionGateway.emitAuctionEnded).toHaveBeenCalled();
      expect(auctionGateway.emitBidWinner).toHaveBeenCalledWith(
        'auction-1',
        'buyer-1',
        expect.objectContaining({ finalPrice: 1200 }),
      );
      expect(auctionGateway.emitBidLost).toHaveBeenCalled();
    });

    it('ENDED müzayedeyi tekrar finalize etmemeli', async () => {
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({ status: AuctionStatus.ENDED }),
      );
      await service.finalizeAuction('auction-1');
      expect(auctionRepo.save).not.toHaveBeenCalled();
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
      auctionRepo.findOne.mockResolvedValue(
        createMockAuction({ bidCount: 3 }),
      );

      await expect(
        service.cancelAuction('auction-1', 'seller-1'),
      ).rejects.toThrow(/admin tarafından/);
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
      expect(result).toHaveProperty('antiSnipingEnabled');
      expect(result).toHaveProperty('serverTime');
      expect(result).toHaveProperty('timeLeftMs');
      expect(result).toHaveProperty('culturalAssetRestricted');
    });
  });
});
