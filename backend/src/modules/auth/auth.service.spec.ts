import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokenType, VerificationToken } from './entities/verification-token.entity';
import { User } from '../user/entities/user.entity';
import { RC } from '../../shared/constants/response-codes';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

describe('AuthService', () => {
  const user = {
    id: 'user-1',
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'User',
    isSeller: false,
    isVerified: false,
    isActive: true,
    passwordHash: '$2b$12$ylsMoEzZ3.jHpmkYAxSFHOnaF9lWUCsF5XAtdctMTfHvhQwj36tVm',
  } as User;

  const createService = () => {
    const manager = {
      findOne: jest.fn(),
      save: jest.fn(async (_entity: unknown, value: unknown) => value),
      update: jest.fn(async () => undefined),
    };
    const verificationTokenRepo = {
      manager: {
        transaction: jest.fn((callback: (tx: typeof manager) => Promise<unknown>) =>
          callback(manager),
        ),
      },
      update: jest.fn(async () => undefined),
      create: jest.fn((value: Partial<VerificationToken>) => value as VerificationToken),
      save: jest.fn(async (value: VerificationToken) => value),
    };
    const refreshTokenRepo = {
      manager: verificationTokenRepo.manager,
      findOne: jest.fn(),
      save: jest.fn(async (value: RefreshToken) => value),
      update: jest.fn(async () => undefined),
      delete: jest.fn(async () => undefined),
      create: jest.fn((value: Partial<RefreshToken>) => value as RefreshToken),
    };
    const userService = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const jwtService = {
      sign: jest.fn(() => 'access-token'),
    };
    const emailService = {
      sendVerificationEmail: jest.fn(async () => undefined),
      sendPasswordResetEmail: jest.fn(async () => undefined),
    };

    const service = new AuthService(
      userService as never,
      jwtService as never,
      emailService as never,
      refreshTokenRepo as never,
      verificationTokenRepo as never,
    );

    return { service, manager, userService, verificationTokenRepo };
  };

  it('returns profile with response code contract', async () => {
    const { service, userService } = createService();
    userService.findById.mockResolvedValue(user);

    const result = await service.getProfile('user-1');

    expect(result.code).toBe(RC.PROFILE_FETCHED);
    expect(result.email).toBe('test@test.com');
  });

  it('rejects missing profile user', async () => {
    const { service, userService } = createService();
    userService.findById.mockResolvedValue(null);

    await expect(service.getProfile('missing')).rejects.toThrow(UnauthorizedException);
  });

  it('verifies email token inside a locked transaction', async () => {
    const { service, manager, verificationTokenRepo } = createService();
    const rawToken = 'verify-token';
    manager.findOne
      .mockResolvedValueOnce({
        id: 'token-1',
        token: hashToken(rawToken),
        type: TokenType.EMAIL_VERIFICATION,
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 60000),
        isUsed: false,
      })
      .mockResolvedValueOnce({ ...user });

    const result = await service.verifyEmail(rawToken);

    expect(result.code).toBe(RC.EMAIL_VERIFIED);
    expect(verificationTokenRepo.manager.transaction).toHaveBeenCalled();
    expect(manager.findOne).toHaveBeenCalledWith(
      VerificationToken,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(manager.save).toHaveBeenCalledWith(
      VerificationToken,
      expect.objectContaining({ isUsed: true }),
    );
  });

  it('rejects reused verification token with typed code', async () => {
    const { service, manager } = createService();
    manager.findOne.mockResolvedValueOnce(null);

    await expect(service.verifyEmail('used-token')).rejects.toThrow(BadRequestException);
  });

  it('resets password and revokes refresh tokens in the same transaction', async () => {
    const { service, manager } = createService();
    const rawToken = 'reset-token';
    manager.findOne
      .mockResolvedValueOnce({
        id: 'token-1',
        token: hashToken(rawToken),
        type: TokenType.PASSWORD_RESET,
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 60000),
        isUsed: false,
      })
      .mockResolvedValueOnce({ ...user });

    const result = await service.resetPassword(rawToken, 'NewPass123!');

    expect(result.code).toBe(RC.PASSWORD_RESET);
    expect(manager.update).toHaveBeenCalledWith(
      RefreshToken,
      { userId: 'user-1', isRevoked: false },
      { isRevoked: true },
    );
  });
});
