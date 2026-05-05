import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import {
  VerificationToken,
  TokenType,
} from './entities/verification-token.entity';
import { EmailService } from '../../shared/email/email.service';
import { RC } from '../../shared/constants/response-codes';
import { User } from '../user/entities/user.entity';

interface DatabaseError {
  code?: unknown;
  driverError?: {
    code?: unknown;
  };
}

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_TTL_DAYS = 7;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(VerificationToken)
    private readonly verificationTokenRepo: Repository<VerificationToken>,
  ) {}

  async register(dto: RegisterDto) {
    // BIZ-16: Email normalization — prevent duplicate accounts via case ("User@X.com" vs "user@x.com")
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existing = await this.userService.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException({
        code: RC.DUPLICATE_EMAIL,
        message: 'Bu e-posta adresi zaten kayıtlı',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // K6: Race condition guard — concurrent register ile aynı email gelirse
    // findByEmail kontrolünü geçen iki istek aynı anda create yapabilir.
    // PostgreSQL UNIQUE constraint'i yakalayıp kullanıcı dostu hata döndürüyoruz.
    let user;
    try {
      user = await this.userService.create({
        email: normalizedEmail,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isVerified: false, // AUTH-02: Email doğrulama gerekli
      });
    } catch (error: unknown) {
      // PostgreSQL unique_violation error code: 23505
      const dbError = error as DatabaseError;
      if (dbError.code === '23505' || dbError.driverError?.code === '23505') {
        throw new ConflictException({
          code: RC.DUPLICATE_EMAIL,
          message: 'Bu e-posta adresi zaten kayıtlı',
        });
      }
      throw error;
    }

    // AUTH-02: Email doğrulama tokeni oluştur ve gönder
    const verificationToken = await this.createVerificationToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
    );
    await this.emailService.sendVerificationEmail(
      user.email,
      verificationToken.rawToken,
    );

    const accessToken = this.generateAccessToken(
      user.id,
      user.email,
      user.isSeller,
    );
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      code: RC.REGISTER_SUCCESS,
      message: 'Kayıt başarılı',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSeller: user.isSeller,
      },
      accessToken,
      refreshToken: refreshToken.rawToken,
    };
  }

  async login(dto: LoginDto) {
    // BIZ-16: Email normalization
    const normalizedEmail = dto.email.trim().toLowerCase();

    // BIZ-04: withDeleted ile sorgulayıp deletedAt kontrolü yap
    const user = await this.userService.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException({
        code: RC.INVALID_CREDENTIALS,
        message: 'Geçersiz e-posta veya şifre',
      });
    }

    // BIZ-04: Soft-deleted user login engeli
    if (user.deletedAt) {
      throw new UnauthorizedException({
        code: RC.ACCOUNT_DELETED_LOGIN,
        message:
          'Bu hesap silinmiş. Geri aktifleştirmek için hesap kurtarma sayfasını kullanın.',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: RC.INVALID_CREDENTIALS,
        message: 'Geçersiz e-posta veya şifre',
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        code: RC.ACCOUNT_DISABLED,
        message: 'Hesabınız devre dışı bırakılmış',
      });
    }

    const accessToken = this.generateAccessToken(
      user.id,
      user.email,
      user.isSeller,
    );
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      code: RC.LOGIN_SUCCESS,
      message: 'Giriş başarılı',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSeller: user.isSeller,
      },
      accessToken,
      refreshToken: refreshToken.rawToken,
    };
  }

  async refresh(refreshTokenStr: string) {
    // T-1-02: Hash the incoming token for DB lookup (tokens stored as SHA-256)
    const tokenHash = this.hashToken(refreshTokenStr);
    let deferredUnauthorized: UnauthorizedException | undefined;

    const result = await this.refreshTokenRepo.manager.transaction(
      async (manager) => {
        // T-1-05: Query WITHOUT isRevoked filter — needed for reuse detection.
        // Pessimistic lock keeps refresh-token rotation single-use under concurrency.
        const tokenRecord = await manager.findOne(RefreshToken, {
          where: { token: tokenHash },
          lock: { mode: 'pessimistic_write' },
        });

        if (!tokenRecord) {
          throw new UnauthorizedException({
            code: RC.INVALID_REFRESH_TOKEN,
            message: 'Geçersiz refresh token',
          });
        }

        // T-1-05: REUSE DETECTION — revoked token replayed → kill ALL user sessions
        if (tokenRecord.isRevoked) {
          await manager.update(
            RefreshToken,
            { userId: tokenRecord.userId, isRevoked: false },
            { isRevoked: true },
          );
          deferredUnauthorized = new UnauthorizedException({
            code: RC.TOKEN_REUSE_DETECTED,
            message:
              'Token yeniden kullanım tespit edildi — tüm oturumlar kapatıldı',
          });
          return null;
        }

        if (tokenRecord.expiresAt < new Date()) {
          // Token expired — revoke it
          tokenRecord.isRevoked = true;
          await manager.save(RefreshToken, tokenRecord);
          deferredUnauthorized = new UnauthorizedException({
            code: RC.REFRESH_TOKEN_EXPIRED,
            message: 'Refresh token süresi dolmuş',
          });
          return null;
        }

        // Revoke old token (rotation)
        tokenRecord.isRevoked = true;
        await manager.save(RefreshToken, tokenRecord);

        // Get user
        const user = await this.userService.findById(tokenRecord.userId);
        if (!user || !user.isActive) {
          deferredUnauthorized = new UnauthorizedException({
            code: RC.ACCOUNT_DISABLED,
            message: 'Kullanıcı bulunamadı veya devre dışı',
          });
          return null;
        }

        // Issue new tokens inside the same transaction as old-token revocation.
        const accessToken = this.generateAccessToken(
          user.id,
          user.email,
          user.isSeller,
        );
        const newRefreshToken = await this.createRefreshToken(user.id, manager);

        return {
          code: RC.TOKEN_REFRESHED,
          message: 'Token yenilendi',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isSeller: user.isSeller,
          },
          accessToken,
          refreshToken: newRefreshToken.rawToken,
        };
      },
    );

    if (deferredUnauthorized) {
      throw deferredUnauthorized;
    }

    if (!result) {
      throw new UnauthorizedException({
        code: RC.INVALID_REFRESH_TOKEN,
        message: 'Geçersiz refresh token',
      });
    }

    return result;
  }

  async logout(refreshTokenStr: string) {
    // T-1-02: Hash the incoming token for DB lookup
    const tokenHash = this.hashToken(refreshTokenStr);
    const tokenRecord = await this.refreshTokenRepo.findOne({
      where: { token: tokenHash },
    });

    if (tokenRecord) {
      tokenRecord.isRevoked = true;
      await this.refreshTokenRepo.save(tokenRecord);
    }

    return { code: RC.LOGOUT_SUCCESS, message: 'Çıkış yapıldı' };
  }

  async revokeAllUserTokens(userId: string) {
    await this.refreshTokenRepo.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  async getProfile(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        code: RC.USER_NOT_FOUND,
        message: 'Kullanıcı bulunamadı',
      });
    }
    // BIZ-14: Profile response — tüm kullanıcı alanları döndürülüyor
    return {
      code: RC.PROFILE_FETCHED,
      message: 'Profil getirildi',
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      birthDate: user.birthDate,
      nationality: user.nationality,
      isSeller: user.isSeller,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }

  // Cleanup expired tokens (call via cron or BullMQ)
  async cleanupExpiredTokens() {
    await this.refreshTokenRepo.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  private generateAccessToken(
    userId: string,
    email: string,
    isSeller: boolean,
  ): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      isSeller,
    });
  }

  private async createRefreshToken(
    userId: string,
    manager?: EntityManager,
  ): Promise<{ rawToken: string }> {
    const rawToken = randomBytes(40).toString('hex');
    // T-1-02: Store SHA-256 hash, never plaintext
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_TTL_DAYS);
    const repo = manager?.getRepository(RefreshToken) ?? this.refreshTokenRepo;

    const refreshToken = repo.create({
      userId,
      token: tokenHash,
      expiresAt,
    });

    await repo.save(refreshToken);
    // Return raw token to client — only the hash is persisted
    return { rawToken };
  }

  /**
   * T-1-02: Deterministic hash for refresh token storage.
   * SHA-256 chosen over bcrypt because:
   * - Tokens are already high-entropy (40 random bytes = 80 hex chars)
   * - Allows direct DB query by hash (bcrypt needs per-row compare)
   * - Rainbow tables infeasible against 320-bit random input
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // ==========================================
  // AUTH-02: Email Doğrulama
  // ==========================================

  async verifyEmail(token: string) {
    // CR-03: Hash incoming token before DB lookup (tokens stored as SHA-256)
    const tokenHash = this.hashToken(token);
    return this.verificationTokenRepo.manager.transaction(async (manager) => {
      const record = await manager.findOne(VerificationToken, {
        where: {
          token: tokenHash,
          type: TokenType.EMAIL_VERIFICATION,
          isUsed: false,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!record) {
        throw new BadRequestException({
          code: RC.INVALID_VERIFICATION_TOKEN,
          message: 'Geçersiz veya kullanılmış doğrulama tokeni',
        });
      }

      if (record.expiresAt < new Date()) {
        throw new BadRequestException({
          code: RC.VERIFICATION_TOKEN_EXPIRED,
          message: 'Doğrulama tokeninin süresi dolmuş',
        });
      }

      record.isUsed = true;
      await manager.save(VerificationToken, record);

      const user = await manager.findOne(User, { where: { id: record.userId } });
      if (user) {
        user.isVerified = true;
        await manager.save(User, user);
      }

      return { code: RC.EMAIL_VERIFIED, message: 'E-posta adresiniz doğrulandı' };
    });
  }

  // ==========================================
  // AUTH-03: Şifre Sıfırlama
  // ==========================================

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userService.findByEmail(normalizedEmail);

    // Kullanıcı bulunamasa bile güvenlik için aynı mesaj dön
    if (!user || user.deletedAt) {
      return {
        code: RC.RESET_EMAIL_SENT,
        message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi',
      };
    }

    const resetToken = await this.createVerificationToken(
      user.id,
      TokenType.PASSWORD_RESET,
    );
    await this.emailService.sendPasswordResetEmail(
      user.email,
      resetToken.rawToken,
    );

    return {
      code: RC.RESET_EMAIL_SENT,
      message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    // CR-03: Hash incoming token before DB lookup
    const tokenHash = this.hashToken(token);
    return this.verificationTokenRepo.manager.transaction(async (manager) => {
      const record = await manager.findOne(VerificationToken, {
        where: {
          token: tokenHash,
          type: TokenType.PASSWORD_RESET,
          isUsed: false,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!record) {
        throw new BadRequestException({
          code: RC.INVALID_RESET_TOKEN,
          message: 'Geçersiz veya kullanılmış sıfırlama tokeni',
        });
      }

      if (record.expiresAt < new Date()) {
        throw new BadRequestException({
          code: RC.RESET_TOKEN_EXPIRED,
          message: 'Sıfırlama tokeninin süresi dolmuş',
        });
      }

      record.isUsed = true;
      await manager.save(VerificationToken, record);

      const user = await manager.findOne(User, { where: { id: record.userId } });
      if (!user) {
        throw new BadRequestException({
          code: RC.USER_NOT_FOUND,
          message: 'Kullanıcı bulunamadı',
        });
      }

      user.passwordHash = await bcrypt.hash(newPassword, 12);
      await manager.save(User, user);
      await manager.update(
        RefreshToken,
        { userId: user.id, isRevoked: false },
        { isRevoked: true },
      );

      return { code: RC.PASSWORD_RESET, message: 'Şifreniz başarıyla sıfırlandı' };
    });
  }

  // ==========================================
  // Verification Token Helper
  // ==========================================

  private async createVerificationToken(
    userId: string,
    type: TokenType,
  ): Promise<{ rawToken: string }> {
    // Invalidate any existing tokens of this type
    await this.verificationTokenRepo.update(
      { userId, type, isUsed: false },
      { isUsed: true },
    );

    const rawToken = randomBytes(32).toString('hex');
    // CR-03: Hash before storage — consistent with refresh token pattern
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setHours(
      expiresAt.getHours() + (type === TokenType.EMAIL_VERIFICATION ? 24 : 1),
    );

    const record = this.verificationTokenRepo.create({
      userId,
      token: tokenHash, // Store hash, not plaintext
      type,
      expiresAt,
    });

    await this.verificationTokenRepo.save(record);
    // Return raw token to send via email — only the hash is persisted
    return { rawToken };
  }
}
