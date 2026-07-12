import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminRole, RC } from '@endemigo/shared';
import { AdminAuthService } from './admin-auth.service';
import { AdminUser } from './entities/admin-user.entity';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AdminAuthService', () => {
  let repo: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };
  let service: AdminAuthService;
  const admin = {
    id: 'admin-1',
    email: 'admin@endemigo.test',
    displayName: 'Admin',
    passwordHash: 'hash',
    roles: [AdminRole.SUPER_ADMIN],
    isActive: true,
    lastLoginAt: null,
  } as AdminUser;

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue({ ...admin }),
      save: jest.fn(async (value) => value),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('admin-token'),
    };
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    service = new AdminAuthService(
      jwtService as unknown as JwtService,
      repo as never,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('logs in an active admin and signs an admin JWT', async () => {
    const result = await service.login({
      email: ' ADMIN@ENDEMIGO.TEST ',
      password: 'Secret123!',
    });

    expect(result.code).toBe(RC.ADMIN_LOGIN_SUCCESS);
    expect(result.accessToken).toBe('admin-token');
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'admin-1',
        type: 'admin',
        roles: [AdminRole.SUPER_ADMIN],
      }),
    );
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ lastLoginAt: expect.any(Date) }),
    );
  });

  it('throws when admin login is inactive', async () => {
    repo.findOne.mockResolvedValueOnce({ ...admin, isActive: false });

    await expect(
      service.login({ email: admin.email, password: 'Secret123!' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws when getMe cannot find an active admin session', async () => {
    repo.findOne.mockResolvedValueOnce(null);

    await expect(service.getMe('missing-admin')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
