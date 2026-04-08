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
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Bu e-posta adresi zaten kayıtlı');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.userService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      isVerified: true, // Skip email verification for vertical slice
    });

    const accessToken = this.generateAccessToken(user.id, user.email, user.isSeller);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
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
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Geçersiz e-posta veya şifre');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Geçersiz e-posta veya şifre');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Hesabınız devre dışı bırakılmış');
    }

    const accessToken = this.generateAccessToken(user.id, user.email, user.isSeller);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
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
      throw new UnauthorizedException('Geçersiz refresh token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      // Token expired — revoke it
      tokenRecord.isRevoked = true;
      await this.refreshTokenRepo.save(tokenRecord);
      throw new UnauthorizedException('Refresh token süresi dolmuş');
    }

    // Revoke old token (rotation)
    tokenRecord.isRevoked = true;
    await this.refreshTokenRepo.save(tokenRecord);

    // Get user
    const user = await this.userService.findById(tokenRecord.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Kullanıcı bulunamadı veya devre dışı');
    }

    // Issue new tokens
    const accessToken = this.generateAccessToken(user.id, user.email, user.isSeller);
    const newRefreshToken = await this.createRefreshToken(user.id);

    return {
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

    return { message: 'Çıkış yapıldı' };
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
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isSeller: user.isSeller,
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
