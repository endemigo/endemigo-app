import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { RC } from '../../shared/constants/response-codes';

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_TTL_DAYS = 7;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async register(dto: RegisterDto) {
    // BIZ-16: Email normalization — prevent duplicate accounts via case ("User@X.com" vs "user@x.com")
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existing = await this.userService.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException({ code: RC.DUPLICATE_EMAIL, message: 'Bu e-posta adresi zaten kayıtlı' });
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
        isVerified: true, // Skip email verification for vertical slice
      });
    } catch (error: any) {
      // PostgreSQL unique_violation error code: 23505
      if (error?.code === '23505' || error?.driverError?.code === '23505') {
        throw new ConflictException({ code: RC.DUPLICATE_EMAIL, message: 'Bu e-posta adresi zaten kayıtlı' });
      }
      throw error;
    }

    const accessToken = this.generateAccessToken(user.id, user.email, user.isSeller);
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
      refreshToken: refreshToken.token,
    };
  }

  async login(dto: LoginDto) {
    // BIZ-16: Email normalization
    const normalizedEmail = dto.email.trim().toLowerCase();

    // BIZ-04: withDeleted ile sorgulayıp deletedAt kontrolü yap
    const user = await this.userService.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException({ code: RC.INVALID_CREDENTIALS, message: 'Geçersiz e-posta veya şifre' });
    }

    // BIZ-04: Soft-deleted user login engeli
    if (user.deletedAt) {
      throw new UnauthorizedException({ code: RC.ACCOUNT_DELETED_LOGIN, message: 'Bu hesap silinmiş. Geri aktifleştirmek için hesap kurtarma sayfasını kullanın.' });
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException({ code: RC.INVALID_CREDENTIALS, message: 'Geçersiz e-posta veya şifre' });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({ code: RC.ACCOUNT_DISABLED, message: 'Hesabınız devre dışı bırakılmış' });
    }

    const accessToken = this.generateAccessToken(user.id, user.email, user.isSeller);
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
      refreshToken: refreshToken.token,
    };
  }

  async refresh(refreshTokenStr: string) {
    const tokenRecord = await this.refreshTokenRepo.findOne({
      where: { token: refreshTokenStr, isRevoked: false },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException({ code: RC.INVALID_REFRESH_TOKEN, message: 'Geçersiz refresh token' });
    }

    if (tokenRecord.expiresAt < new Date()) {
      // Token expired — revoke it
      tokenRecord.isRevoked = true;
      await this.refreshTokenRepo.save(tokenRecord);
      throw new UnauthorizedException({ code: RC.REFRESH_TOKEN_EXPIRED, message: 'Refresh token süresi dolmuş' });
    }

    // Revoke old token (rotation)
    tokenRecord.isRevoked = true;
    await this.refreshTokenRepo.save(tokenRecord);

    // Get user
    const user = await this.userService.findById(tokenRecord.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException({ code: RC.ACCOUNT_DISABLED, message: 'Kullanıcı bulunamadı veya devre dışı' });
    }

    // Issue new tokens
    const accessToken = this.generateAccessToken(user.id, user.email, user.isSeller);
    const newRefreshToken = await this.createRefreshToken(user.id);

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
      refreshToken: newRefreshToken.token,
    };
  }

  async logout(refreshTokenStr: string) {
    const tokenRecord = await this.refreshTokenRepo.findOne({
      where: { token: refreshTokenStr },
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
      throw new UnauthorizedException({ code: RC.USER_NOT_FOUND, message: 'Kullanıcı bulunamadı' });
    }
    // BIZ-14: Profile response — tüm kullanıcı alanları döndürülüyor
    return {
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

  private generateAccessToken(userId: string, email: string, isSeller: boolean): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      isSeller,
    });
  }

  private async createRefreshToken(userId: string): Promise<RefreshToken> {
    const token = randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_TTL_DAYS);

    const refreshToken = this.refreshTokenRepo.create({
      userId,
      token,
      expiresAt,
    });

    return this.refreshTokenRepo.save(refreshToken);
  }
}
