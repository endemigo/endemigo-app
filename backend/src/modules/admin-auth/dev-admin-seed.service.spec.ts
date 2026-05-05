import { ConfigService } from '@nestjs/config';
import { AdminRole } from '@endemigo/shared';
import { DevAdminSeedService } from './dev-admin-seed.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('DevAdminSeedService', () => {
  let configService: {
    get: jest.Mock;
  };
  let repo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let service: DevAdminSeedService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          NODE_ENV: 'development',
        };
        return values[key];
      }),
    };
    repo = {
      findOne: jest.fn(),
      save: jest.fn(async (value) => value),
      create: jest.fn((value) => value),
    };
    service = new DevAdminSeedService(
      configService as unknown as ConfigService,
      repo as never,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates the development admin when missing', async () => {
    repo.findOne.mockResolvedValueOnce(null);

    await service.onModuleInit();

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@endemigo.test',
        displayName: 'Development Admin',
        roles: [AdminRole.SUPER_ADMIN],
        isActive: true,
      }),
    );
    expect(repo.save).toHaveBeenCalled();
  });

  it('refreshes the development admin when it already exists', async () => {
    const admin = {
      id: 'admin-1',
      email: 'admin@endemigo.test',
      passwordHash: 'old-hash',
      displayName: 'Old',
      roles: [AdminRole.SUPPORT],
      isActive: false,
      lastLoginAt: null,
    };
    repo.findOne.mockResolvedValueOnce(admin);

    await service.onModuleInit();

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@endemigo.test',
        passwordHash: 'hashed-password',
        displayName: 'Development Admin',
        roles: [AdminRole.SUPER_ADMIN],
        isActive: true,
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

    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
