import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  ForgotPasswordDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/password-recovery.dto';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  // K2: Auth rate limiting — 5 istek/dk (brute force koruması)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Yeni kullanıcı kaydı' })
  @ApiResponse({
    status: 201,
    type: AuthResponseDto,
    description: 'Kayıt başarılı',
  })
  @ApiResponse({ status: 409, description: 'E-posta zaten kayıtlı' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.register(dto, ip, userAgent);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // K2: Auth rate limiting — 5 istek/dk
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Kullanıcı girişi' })
  @ApiResponse({
    status: 200,
    type: AuthResponseDto,
    description: 'Giriş başarılı',
  })
  @ApiResponse({ status: 401, description: 'Geçersiz e-posta veya şifre' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  // WR-07: Rate limit refresh endpoint — defense-in-depth against token probing
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Access token yenileme (refresh token rotation)' })
  @ApiResponse({
    status: 200,
    type: AuthResponseDto,
    description: 'Token yenilendi',
  })
  @ApiResponse({
    status: 401,
    description: 'Geçersiz veya süresi dolmuş refresh token',
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Çıkış yap (refresh token revoke)' })
  @ApiResponse({ status: 200, description: 'Çıkış yapıldı' })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kullanıcı profili' })
  @ApiResponse({
    status: 200,
    type: UserResponseDto,
    description: 'Profil bilgileri',
  })
  @ApiResponse({ status: 401, description: 'Token geçersiz' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  // ==========================================
  // AUTH-02: Email Doğrulama
  // ==========================================

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'E-posta adresini doğrula' })
  @ApiResponse({ status: 200, description: 'E-posta doğrulandı' })
  @ApiResponse({ status: 400, description: 'Geçersiz token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Doğrulama e-postasını yeniden gönder' })
  @ApiResponse({
    status: 200,
    description: 'E-posta kayıtlıysa doğrulama bağlantısı gönderildi',
  })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(dto.email);
  }

  // ==========================================
  // AUTH-03: Şifre Sıfırlama
  // ==========================================

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Şifre sıfırlama e-postası gönder' })
  @ApiResponse({ status: 200, description: 'Sıfırlama linki gönderildi' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Şifreyi sıfırla (token ile)' })
  @ApiResponse({ status: 200, description: 'Şifre sıfırlandı' })
  @ApiResponse({ status: 400, description: 'Geçersiz token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
