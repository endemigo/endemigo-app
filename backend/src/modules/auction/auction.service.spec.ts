import { Test, TestingModule } from '@nestjs/testing';
import { AuctionService } from './auction.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { Auction } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { WalletService } from '../wallet/wallet.service';
import { UserService } from '../user/user.service';
import { AuctionStatus } from '../../shared/types/auction-status.enum';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AuctionService', () => {
  let service: AuctionService;
  let auctionRepo: any;
  let bidRepo: any;
  let walletService: any;
  let userService: any;
  let auctionQueue: any;

  const mockSeller = { id: 'seller-1', isSeller: true, firstName: 'Ali', lastName: 'Veli' };
  const mockBuyer = { id: 'buyer-1', isSeller: false, firstName: 'Buyer', lastName: 'Test' };

  const mockAuction = {
    id: 'auction-1',
    productId: 'product-1',
    sellerId: 'seller-1',
    startPrice: 1000,
    currentPrice: 1000,
    minIncrement: 100,
    buyerPremiumRate: 0.25,
    status: AuctionStatus.ACTIVE,
    startTime: new Date(Date.now() - 3600000), // 1 hour ago
    endTime: new Date(Date.now() + 86400000),  // 24h from now (always future)
    winnerId: null,
    bidCount: 0,
    product: { title: 'Test' },
    seller: mockSeller,
    winner: null,
  };

  beforeEach(async () => {
    auctionRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn((data) => ({ id: 'auction-new', bidCount: 0, ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    bidRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => ({ id: 'bid-new', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    walletService = {
      getBalance: jest.fn().mockResolvedValue({ balance: 10000, held: 0, available: 10000 }),
      createHold: jest.fn().mockResolvedValue({ id: 'hold-1' }),
      releaseHold: jest.fn().mockResolvedValue(null),
      captureHold: jest.fn().mockResolvedValue({ id: 'hold-1', status: 'captured' }),
      releaseAllHoldsForAuction: jest.fn().mockResolvedValue(undefined),
    };
    userService = {
      findById: jest.fn(),
    };
    auctionQueue = {
      add: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionService,
        { provide: getRepositoryToken(Auction), useValue: auctionRepo },
        { provide: getRepositoryToken(Bid), useValue: bidRepo },
        { provide: WalletService, useValue: walletService },
        { provide: UserService, useValue: userService },
        { provide: getQueueToken('auction'), useValue: auctionQueue },
      ],
    }).compile();

    service = module.get<AuctionService>(AuctionService);
  });

  // ==========================================
  // K1.1: Müzayede oluşturma
  // ==========================================
  describe('create', () => {
    it('seller müzayede oluşturabilmeli', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      auctionRepo.findOne.mockResolvedValueOnce(null); // no active auction
      auctionRepo.findOne.mockResolvedValue({ ...mockAuction, id: 'auction-new' }); // findById after save
      
      const result = await service.create('seller-1', {
        productId: 'product-1',
        startPrice: 1000,
        startTime: '2026-04-08T10:00:00Z',
        endTime: '2026-04-08T12:00:00Z',
      });

      expect(auctionRepo.save).toHaveBeenCalled();
      expect(auctionQueue.add).toHaveBeenCalledTimes(2); // start + end jobs
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
      auctionRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create('seller-1', {
          productId: 'product-1',
          startPrice: 1000,
          startTime: '2026-04-08T12:00:00Z',
          endTime: '2026-04-08T10:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // K1.2: Teklif verme — 6-step validation
  // ==========================================
  describe('placeBid', () => {
    beforeEach(() => {
      auctionRepo.findOne.mockResolvedValue({ ...mockAuction });
    });

    it('geçerli teklif kabul edilmeli', async () => {
      const result = await service.placeBid('auction-1', 'buyer-1', { amount: 1100 });
      expect(bidRepo.save).toHaveBeenCalled();
      expect(walletService.createHold).toHaveBeenCalledWith('auction-1', 'buyer-1', 1100);
    });

    it('kendi müzayedesine teklif → BadRequest', async () => {
      await expect(
        service.placeBid('auction-1', 'seller-1', { amount: 1100 }),
      ).rejects.toThrow('Kendi müzayedenize teklif veremezsiniz');
    });

    it('min increment altı teklif → BadRequest', async () => {
      await expect(
        service.placeBid('auction-1', 'buyer-1', { amount: 1050 }),
      ).rejects.toThrow(/Minimum teklif/);
    });

    it('yetersiz bakiye → BadRequest', async () => {
      walletService.getBalance.mockResolvedValue({ balance: 500, held: 0, available: 500 });
      await expect(
        service.placeBid('auction-1', 'buyer-1', { amount: 1100 }),
      ).rejects.toThrow(/Yetersiz bakiye/);
    });

    it('aktif olmayan müzayede → BadRequest', async () => {
      auctionRepo.findOne.mockResolvedValue({ ...mockAuction, status: AuctionStatus.ENDED });
      await expect(
        service.placeBid('auction-1', 'buyer-1', { amount: 1100 }),
      ).rejects.toThrow('Müzayede aktif değil');
    });

    it('premium doğru hesaplanmalı', async () => {
      await service.placeBid('auction-1', 'buyer-1', { amount: 1100 });
      expect(bidRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ premiumAmount: 275 }), // 1100 * 0.25
      );
    });

    it('önceki hold release edilmeli', async () => {
      await service.placeBid('auction-1', 'buyer-1', { amount: 1100 });
      expect(walletService.releaseHold).toHaveBeenCalledWith('auction-1', 'buyer-1');
      expect(walletService.createHold).toHaveBeenCalledWith('auction-1', 'buyer-1', 1100);
    });

    it('bidCount artmalı', async () => {
      await service.placeBid('auction-1', 'buyer-1', { amount: 1100 });
      expect(auctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ bidCount: 1, currentPrice: 1100 }),
      );
    });
  });

  // ==========================================
  // K1.3: Finalize — kazanan belirleme
  // ==========================================
  describe('finalizeAuction', () => {
    it('en yüksek teklifi kazanan yapmalı', async () => {
      auctionRepo.findOne.mockResolvedValue({ ...mockAuction });
      bidRepo.findOne.mockResolvedValue({ bidderId: 'buyer-1', amount: 1500 });

      await service.finalizeAuction('auction-1');

      expect(auctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuctionStatus.ENDED, winnerId: 'buyer-1' }),
      );
      expect(walletService.captureHold).toHaveBeenCalledWith('auction-1', 'buyer-1');
      expect(walletService.releaseAllHoldsForAuction).toHaveBeenCalledWith('auction-1', 'buyer-1');
    });

    it('teklif yoksa winnerId null kalmalı', async () => {
      auctionRepo.findOne.mockResolvedValue({ ...mockAuction });
      bidRepo.findOne.mockResolvedValue(null);

      await service.finalizeAuction('auction-1');

      expect(auctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuctionStatus.ENDED }),
      );
      expect(walletService.captureHold).not.toHaveBeenCalled();
    });

    it('ended müzayedeyi tekrar finalize etmemeli', async () => {
      auctionRepo.findOne.mockResolvedValue({ ...mockAuction, status: AuctionStatus.ENDED });
      await service.finalizeAuction('auction-1');
      expect(auctionRepo.save).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // K1.4: findById edge case
  // ==========================================
  describe('findById', () => {
    it('olmayan müzayede → NotFoundException', async () => {
      auctionRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
