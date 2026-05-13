import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { SellerProfile, SellerStatus } from './entities/seller-profile.entity';
import { KvkkConsent, ConsentType } from './entities/kvkk-consent.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Product } from '../product/entities/product.entity';
import { Order } from '../order/entities/order.entity';
import { Notification } from '../notification/entities/notification.entity';
import { Conversation } from '../negotiation/entities/conversation.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { PayoutRequest } from '../wallet/entities/payout-request.entity';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AddressType, NegotiationStatus, OrderStatus, PayoutRequestStatus } from '@endemigo/shared';
import * as bcrypt from 'bcrypt';
import { RC } from '../../shared/constants/response-codes';

describe('UserService', () => {
  let service: UserService;
  let userRepo: any;
  let sellerProfileRepo: any;
  let kvkkConsentRepo: any;
  let addressRepo: any;
  let refreshTokenRepo: any;
  let productRepo: any;
  let orderRepo: any;
  let notificationRepo: any;
  let conversationRepo: any;
  let walletRepo: any;
  let payoutRequestRepo: any;
  let publicSellerQb: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'User',
    phone: null,
    isSeller: false,
    isActive: true,
    isVerified: true,
    passwordHash: '', // Will be set in beforeEach
    deletedAt: null,
  };

  beforeEach(async () => {
    mockUser.passwordHash = await bcrypt.hash('Test1234!', 12);

    publicSellerQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };

    userRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(publicSellerQb),
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      softDelete: jest.fn().mockResolvedValue(undefined),
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
        transaction: jest.fn((cb) => {
          // Simulate transactional EntityManager
          const txManager = {
            findOne: userRepo.findOne,
            create: (EntityClass: any, data: any) => ({ id: 'new-id', ...data }),
            save: jest.fn((entity: any) => Promise.resolve(entity)),
          };
          return cb(txManager);
        }),
      },
    };

    sellerProfileRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ id: 'seller-profile-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    kvkkConsentRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => ({ id: 'consent-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    addressRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((data) => ({ id: 'address-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      softDelete: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      manager: {
        transaction: jest.fn(async (cb) => {
          const manager = {
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn((EntityClass: unknown, data: Record<string, unknown>) => ({
              id: 'address-1',
              ...data,
            })),
            save: jest.fn(async (_EntityClass: unknown, entity: Record<string, unknown>) => entity),
            update: jest.fn().mockResolvedValue(undefined),
          };
          return cb(manager);
        }),
      },
    };

    refreshTokenRepo = {
      delete: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };

    productRepo = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };

    orderRepo = {
      count: jest.fn().mockResolvedValue(0),
    };

    notificationRepo = {
      count: jest.fn().mockResolvedValue(0),
    };

    conversationRepo = {
      count: jest.fn().mockResolvedValue(0),
    };

    walletRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    payoutRequestRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(SellerProfile), useValue: sellerProfileRepo },
        { provide: getRepositoryToken(KvkkConsent), useValue: kvkkConsentRepo },
        { provide: getRepositoryToken(Address), useValue: addressRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Notification), useValue: notificationRepo },
        { provide: getRepositoryToken(Conversation), useValue: conversationRepo },
        { provide: getRepositoryToken(Wallet), useValue: walletRepo },
        { provide: getRepositoryToken(PayoutRequest), useValue: payoutRequestRepo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  // ==========================================
  // updateProfile
  // ==========================================
  describe('updateProfile', () => {
    it('should update firstName and lastName', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });

      const result = await service.updateProfile('user-1', {
        firstName: 'Updated',
        lastName: 'Name',
      });

      expect(result.code).toBe(RC.PROFILE_UPDATED);
      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
    });

    it('should update phone number', async () => {
      userRepo.findOne
        .mockResolvedValueOnce({ ...mockUser }) // findOne by id
        .mockResolvedValueOnce(null); // findOne by phone (no duplicate)

      const result = await service.updateProfile('user-1', {
        phone: '+905551234567',
      });

      expect(result.code).toBe(RC.PROFILE_UPDATED);
      expect(result.phone).toBe('+905551234567');
    });

    it('should reject duplicate phone number', async () => {
      userRepo.findOne
        .mockResolvedValueOnce({ ...mockUser }) // findOne by id
        .mockResolvedValueOnce({ id: 'other-user', phone: '+905551234567' }); // duplicate

      await expect(
        service.updateProfile('user-1', { phone: '+905551234567' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for missing user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile('nonexistent', { firstName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================
  // becomeSeller
  // ==========================================
  describe('becomeSeller', () => {
    it('should create seller profile and keep isSeller=false pending admin approval', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isSeller: false });

      const result = await service.becomeSeller('user-1', {
        businessName: 'Test Mağazası',
        agreementAccepted: true,
      });

      expect(result.code).toBe(RC.SELLER_APPLICATION_PENDING);
      expect(result.isSeller).toBe(false);
      expect(result.sellerProfile.businessName).toBe('Test Mağazası');
      expect(result.sellerProfile.status).toBe(SellerStatus.PENDING);
      // CR-03: becomeSeller now runs inside a transaction
      expect(userRepo.manager.transaction).toHaveBeenCalled();
    });

    it('should reject if already seller (409)', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isSeller: true });

      await expect(
        service.becomeSeller('user-1', { businessName: 'Test', agreementAccepted: true }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for missing user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.becomeSeller('nonexistent', { businessName: 'Test', agreementAccepted: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================
  // getSellerProfile
  // ==========================================
  describe('getSellerProfile', () => {
    it('should return seller profile', async () => {
      const profile = { id: 'sp-1', businessName: 'Shop', status: SellerStatus.APPROVED };
      sellerProfileRepo.findOne.mockResolvedValue(profile);

      const result = await service.getSellerProfile('user-1');
      expect(result.code).toBe(RC.SELLER_PROFILE_FETCHED);
      expect(result.sellerProfile.businessName).toBe('Shop');
    });

    it('should throw NotFoundException if no seller profile', async () => {
      sellerProfileRepo.findOne.mockResolvedValue(null);

      await expect(service.getSellerProfile('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addresses', () => {
    it('should list user addresses by type', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isSeller: true });
      addressRepo.find.mockResolvedValue([
        { id: 'address-1', type: AddressType.SHIPPING, title: 'Home' },
      ]);

      const result = await service.listAddresses('user-1', AddressType.SHIPPING);

      expect(result.code).toBe(RC.ADDRESS_LIST_FETCHED);
      expect(result.addresses).toHaveLength(1);
      expect(addressRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', type: AddressType.SHIPPING } }),
      );
    });

    it('should create sender address for seller', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isSeller: true });

      const result = await service.createAddress('user-1', {
        type: AddressType.SENDER,
        title: 'Warehouse',
        fullName: 'Test User',
        phone: '+905551234567',
        city: 'Istanbul',
        district: 'Kadikoy',
        addressLine: 'Example address line',
        isDefault: true,
      });

      expect(result.code).toBe(RC.ADDRESS_CREATED);
      expect(result.address.type).toBe(AddressType.SENDER);
    });

    it('should reject sender address creation for non-seller', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isSeller: false });

      await expect(
        service.createAddress('user-1', {
          type: AddressType.SENDER,
          title: 'Warehouse',
          fullName: 'Test User',
          phone: '+905551234567',
          city: 'Istanbul',
          district: 'Kadikoy',
          addressLine: 'Example address line',
        }),
      ).rejects.toThrow();
    });
  });

  describe('getSellerDashboardSummary', () => {
    it('should aggregate seller dashboard metrics', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isSeller: true });
      sellerProfileRepo.findOne.mockResolvedValue({
        businessName: 'Test Store',
        status: SellerStatus.APPROVED,
      });
      orderRepo.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4);
      productRepo.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3);
      notificationRepo.count.mockResolvedValue(9);
      conversationRepo.count.mockResolvedValue(4);
      walletRepo.findOne.mockResolvedValue({ balance: 1500, heldAmount: 500 });
      payoutRequestRepo.find.mockResolvedValue([
        { amount: 100, status: PayoutRequestStatus.REQUESTED },
        { amount: 200, status: PayoutRequestStatus.APPROVED },
        { amount: 300, status: PayoutRequestStatus.PAID },
      ]);
      addressRepo.count.mockResolvedValue(2);

      const result = await service.getSellerDashboardSummary('user-1');

      expect(result.code).toBe(RC.SELLER_DASHBOARD_FETCHED);
      expect(result.summary.orders.newOrders).toBe(2);
      expect(result.summary.wallet.available).toBe(1000);
      expect(result.summary.payouts.pendingAmount).toBe(100);
      expect(result.summary.addresses.senderAddressCount).toBe(2);
    });
  });

  // ==========================================
  // KVKK Consents
  // ==========================================
  describe('getConsents', () => {
    it('should return consents list', async () => {
      const consents = [
        { id: '1', consentType: 'MARKETING', isAccepted: true },
      ];
      kvkkConsentRepo.find.mockResolvedValue(consents);

      const result = await service.getConsents('user-1');
      expect(result.code).toBe(RC.CONSENT_LIST);
      expect(result.consents).toHaveLength(1);
      expect(result.consents[0].consentType).toBe('MARKETING');
    });
  });

  describe('createConsent', () => {
    it('should create immutable consent record', async () => {
      const result = await service.createConsent(
        'user-1',
        { consentType: ConsentType.MARKETING, isAccepted: true },
        '127.0.0.1',
        'TestAgent/1.0',
      );

      expect(result.code).toBe(RC.CONSENT_CREATED);
      expect(result.consent.consentType).toBe('MARKETING');
      expect(result.consent.ipAddress).toBe('127.0.0.1');
      expect(kvkkConsentRepo.save).toHaveBeenCalled();
    });

    it('should create consent with isAccepted=false (withdrawal)', async () => {
      const result = await service.createConsent(
        'user-1',
        { consentType: ConsentType.THIRD_PARTY_SHARING, isAccepted: false },
      );

      expect(result.consent.isAccepted).toBe(false);
    });
  });

  // ==========================================
  // deleteAccount
  // ==========================================
  describe('deleteAccount', () => {
    it('should soft-delete account with valid password', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });

      const result = await service.deleteAccount('user-1', 'Test1234!');

      expect(result.code).toBe(RC.ACCOUNT_DELETED);
      expect(userRepo.save).toHaveBeenCalled();
      expect(userRepo.softDelete).toHaveBeenCalledWith('user-1');
    });

    it('should block deletion while active workflows exist', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      userRepo.manager.createQueryBuilder().getOne.mockResolvedValueOnce({ id: 'auction-1' });

      await expect(
        service.deleteAccount('user-1', 'Test1234!'),
      ).rejects.toThrow(BadRequestException);
      expect(userRepo.softDelete).not.toHaveBeenCalled();
    });

    it('should reject wrong password', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });

      await expect(
        service.deleteAccount('user-1', 'WrongPassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException for missing user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteAccount('nonexistent', 'Test1234!'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================
  // reactivateAccount
  // ==========================================
  describe('reactivateAccount', () => {
    it('should reactivate within grace period', async () => {
      const deletedUser = {
        ...mockUser,
        isActive: false,
        deletedAt: new Date(), // Just deleted
      };
      userRepo.findOne.mockResolvedValue(deletedUser);

      const result = await service.reactivateAccount('Test@Test.com', 'Test1234!');

      expect(result.code).toBe(RC.ACCOUNT_REACTIVATED);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
        withDeleted: true,
      });
    });

    it('should reject if account already active', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isActive: true, deletedAt: null });

      await expect(
        service.reactivateAccount('test@test.com', 'Test1234!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if grace period expired (>30 days)', async () => {
      const expiredUser = {
        ...mockUser,
        isActive: false,
        deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
      };
      userRepo.findOne.mockResolvedValue(expiredUser);

      await expect(
        service.reactivateAccount('test@test.com', 'Test1234!'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // getPublicSeller
  // ==========================================
  describe('getPublicSeller', () => {
    it('should return public seller profile with products', async () => {
      publicSellerQb.getOne.mockResolvedValue({
        ...mockUser,
        firstName: 'Ege',
        lastName: 'Zeytinlikleri',
        avatarUrl: 'https://avatar.url',
        bannerUrl: 'https://banner.url',
        bio: 'Dogal zeytinyagi ureticisi',
        location: 'Izmir',
        createdAt: new Date('2019-01-01'),
        sellerProfile: { businessName: 'Ege Zeytinlikleri' },
      });
      productRepo.find.mockResolvedValue([
        {
          id: 'prod-1',
          title: 'Zeytinyagi',
          price: 450,
          imageUrl: 'https://img.url',
          status: 'ACTIVE',
          sellerId: 'user-1',
          stockQuantity: 10,
          favoriteCount: 5,
          createdAt: new Date(),
          images: [],
          category: { name: 'Zeytinyagi' },
        },
      ]);

      const result = await service.getPublicSeller('user-1');

      expect(result).not.toBeNull();
      expect(result!.profile.name).toBe('Ege Zeytinlikleri');
      expect(result!.profile.description).toBe('Dogal zeytinyagi ureticisi');
      expect(result!.profile.location).toBe('Izmir');
      expect(result!.profile.since).toBe('2019');
      expect(result!.products).toHaveLength(1);
      expect(result!.products[0].title).toBe('Zeytinyagi');
    });

    it('should fallback to firstName+lastName when no businessName', async () => {
      publicSellerQb.getOne.mockResolvedValue({
        ...mockUser,
        firstName: 'Ahmet',
        lastName: 'Yilmaz',
        avatarUrl: null,
        bannerUrl: null,
        bio: null,
        location: null,
        createdAt: new Date('2021-06-15'),
        sellerProfile: null,
      });
      productRepo.find.mockResolvedValue([]);

      const result = await service.getPublicSeller('user-1');

      expect(result).not.toBeNull();
      expect(result!.profile.name).toBe('Ahmet Yilmaz');
      expect(result!.profile.location).toBe('Türkiye');
      expect(result!.products).toHaveLength(0);
    });

    it('should return null for non-existent user', async () => {
      publicSellerQb.getOne.mockResolvedValue(null);

      const result = await service.getPublicSeller('nonexistent');
      expect(result).toBeNull();
    });
  });
});
