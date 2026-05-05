import { ConfigService } from '@nestjs/config';
import { SellerStatus } from './entities/seller-profile.entity';
import { DevSellerSeedService } from './dev-seller-seed.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('DevSellerSeedService', () => {
  let configService: {
    get: jest.Mock;
  };
  let userRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let sellerProfileRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let service: DevSellerSeedService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          NODE_ENV: 'development',
        };
        return values[key];
      }),
    };
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (value) => value),
      create: jest.fn((value) => value),
    };
    sellerProfileRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (value) => value),
      create: jest.fn((value) => value),
    };
    service = new DevSellerSeedService(
      configService as unknown as ConfigService,
      userRepo as never,
      sellerProfileRepo as never,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates the development seller when missing', async () => {
    userRepo.findOne.mockResolvedValueOnce(null);

    await service.onModuleInit();

    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@a.com',
        passwordHash: 'hashed-password',
        firstName: 'Ahmet',
        lastName: 'Aydın',
        isSeller: true,
        isVerified: true,
        isActive: true,
      }),
    );
    expect(sellerProfileRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        businessName: 'A&A Onaylı Satıcı',
        status: SellerStatus.APPROVED,
        agreementVersion: '1.0.0',
        commissionRate: 0.15,
      }),
    );
    expect(sellerProfileRepo.save).toHaveBeenCalled();
  });

  it('refreshes the development seller when it already exists', async () => {
    const existingUser = {
      id: 'user-1',
      email: 'a@a.com',
      passwordHash: 'old-hash',
      firstName: 'Old',
      lastName: 'Name',
      isSeller: false,
      isVerified: false,
      isActive: false,
      sellerProfile: {
        id: 'seller-profile-1',
      },
    };
    const existingProfile = {
      id: 'seller-profile-1',
      userId: 'user-1',
      businessName: 'Old Business',
      status: SellerStatus.PENDING,
      approvedAt: null,
      agreementAcceptedAt: null,
      agreementVersion: '0.9.0',
      commissionRate: 0.2,
    };
    userRepo.findOne.mockResolvedValueOnce(existingUser);
    sellerProfileRepo.findOne.mockResolvedValueOnce(existingProfile);

    await service.onModuleInit();

    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@a.com',
        passwordHash: 'hashed-password',
        firstName: 'Ahmet',
        lastName: 'Aydın',
        isSeller: true,
        isVerified: true,
        isActive: true,
      }),
    );
    expect(sellerProfileRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        businessName: 'A&A Onaylı Satıcı',
        status: SellerStatus.APPROVED,
        agreementVersion: '0.9.0',
        commissionRate: 0.2,
      }),
    );
  });

  it('does nothing outside development', async () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        NODE_ENV: 'production',
      };
      return values[key];
    });

    await service.onModuleInit();

    expect(userRepo.findOne).not.toHaveBeenCalled();
    expect(userRepo.save).not.toHaveBeenCalled();
    expect(sellerProfileRepo.save).not.toHaveBeenCalled();
  });
});
