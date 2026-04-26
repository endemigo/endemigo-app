import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletHold } from './entities/wallet-hold.entity';
import { BadRequestException } from '@nestjs/common';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: any;
  let holdRepo: any;

  const mockWallet = {
    id: 'wallet-1',
    userId: 'user-1',
    balance: 10000,
    heldAmount: 0,
  };

  beforeEach(async () => {
    walletRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ id: 'wallet-new', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    holdRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => ({ id: 'hold-new', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: getRepositoryToken(Wallet), useValue: walletRepo },
        { provide: getRepositoryToken(WalletHold), useValue: holdRepo },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  // ==========================================
  // K2.1: getOrCreateWallet — lazy creation
  // ==========================================
  describe('getOrCreateWallet', () => {
    it('mevcut cüzdanı döndürmeli', async () => {
      walletRepo.findOne.mockResolvedValue(mockWallet);
      const result = await service.getOrCreateWallet('user-1');
      expect(result.balance).toBe(10000);
      expect(walletRepo.create).not.toHaveBeenCalled();
    });

    it('yoksa 10000₺ ile yeni cüzdan oluşturmalı', async () => {
      walletRepo.findOne.mockResolvedValue(null);
      const result = await service.getOrCreateWallet('user-1');
      expect(walletRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', balance: 10000, heldAmount: 0 }),
      );
      expect(walletRepo.save).toHaveBeenCalled();
    });
  });

  // ==========================================
  // K2.2: getBalance — matematik doğruluğu
  // ==========================================
  describe('getBalance', () => {
    it('available = balance - held olmalı', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet, balance: 10000, heldAmount: 3000 });
      const result = await service.getBalance('user-1');
      expect(result.balance).toBe(10000);
      expect(result.held).toBe(3000);
      expect(result.available).toBe(7000);
    });

    it('hiç hold yoksa available = balance olmalı', async () => {
      walletRepo.findOne.mockResolvedValue(mockWallet);
      const result = await service.getBalance('user-1');
      expect(result.available).toBe(10000);
    });
  });

  // ==========================================
  // K2.3: createHold — bakiye kontrolü
  // ==========================================
  describe('createHold', () => {
    it('yeterli bakiye varsa hold oluşturmalı', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet });
      await service.createHold('auction-1', 'user-1', 5000);
      expect(holdRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 5000, status: 'HELD' }),
      );
      expect(holdRepo.save).toHaveBeenCalled();
    });

    it('yetersiz bakiye → BadRequestException', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet, heldAmount: 9500 });
      await expect(service.createHold('auction-1', 'user-1', 1000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('tam bakiyeyle hold tutabilmeli', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet });
      await expect(service.createHold('auction-1', 'user-1', 10000)).resolves.toBeDefined();
    });

    it('heldAmount artmalı', async () => {
      const wallet = { ...mockWallet };
      walletRepo.findOne.mockResolvedValue(wallet);
      await service.createHold('auction-1', 'user-1', 3000);
      expect(walletRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ heldAmount: 3000 }),
      );
    });
  });

  // ==========================================
  // K2.4: releaseHold — bakiye geri dönüşü
  // ==========================================
  describe('releaseHold', () => {
    it('held durumundaki hold release edilmeli', async () => {
      holdRepo.findOne.mockResolvedValue({ id: 'hold-1', amount: 5000, status: 'held' });
      walletRepo.findOne.mockResolvedValue({ ...mockWallet, heldAmount: 5000 });
      const result = await service.releaseHold('auction-1', 'user-1');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('RELEASED');
    });

    it('hold yoksa null dönmeli', async () => {
      holdRepo.findOne.mockResolvedValue(null);
      const result = await service.releaseHold('auction-1', 'user-1');
      expect(result).toBeNull();
    });

    it('heldAmount azalmalı', async () => {
      holdRepo.findOne.mockResolvedValue({ id: 'hold-1', amount: 3000, status: 'held' });
      walletRepo.findOne.mockResolvedValue({ ...mockWallet, heldAmount: 3000 });
      await service.releaseHold('auction-1', 'user-1');
      expect(walletRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ heldAmount: 0 }),
      );
    });
  });

  // ==========================================
  // K2.5: captureHold — gerçek kesim
  // ==========================================
  describe('captureHold', () => {
    it('balance azalmalı, heldAmount azalmalı', async () => {
      holdRepo.findOne.mockResolvedValue({ id: 'hold-1', amount: 5000, status: 'held' });
      walletRepo.findOne.mockResolvedValue({ ...mockWallet, balance: 10000, heldAmount: 5000 });
      await service.captureHold('auction-1', 'user-1');
      expect(walletRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ balance: 5000, heldAmount: 0 }),
      );
    });

    it('hold yoksa null dönmeli', async () => {
      holdRepo.findOne.mockResolvedValue(null);
      const result = await service.captureHold('auction-1', 'user-1');
      expect(result).toBeNull();
    });
  });
});
