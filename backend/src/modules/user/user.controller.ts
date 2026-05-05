import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { UserService } from './user.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { BecomeSellerDto } from './dto/become-seller.dto';
import { CreateKvkkConsentDto } from './dto/kvkk-consent.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ReactivateAccountDto } from './dto/reactivate-account.dto';
import { RC } from '../../shared/constants/response-codes';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ==========================================
  // Profil
  // ==========================================

  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil bilgilerini güncelle' })
  @ApiResponse({ status: 200, description: 'Profil güncellendi' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(userId, dto);
  }

  // ==========================================
  // Satıcı Geçişi
  // ==========================================

  @Post('become-seller')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Satıcı hesabına geçiş — sözleşme kabul + profil oluştur' })
  @ApiResponse({ status: 201, description: 'Satıcı hesabı aktifleştirildi' })
  @ApiResponse({ status: 409, description: 'Zaten satıcısınız' })
  async becomeSeller(
    @CurrentUser('id') userId: string,
    @Body() dto: BecomeSellerDto,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.userService.becomeSeller(userId, dto, ip, userAgent);
  }

  @Get('seller-profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Satıcı profilini getir' })
  @ApiResponse({ status: 200, description: 'Satıcı profili' })
  @ApiResponse({ status: 404, description: 'Satıcı profili bulunamadı' })
  async getSellerProfile(@CurrentUser('id') userId: string) {
    return this.userService.getSellerProfile(userId);
  }

  @Public()
  @Get('sellers/:id')
  @ApiOperation({ summary: 'Public satıcı profilini ve ürünlerini getir' })
  @ApiResponse({ status: 200, description: 'Satıcı profili ve ürünleri' })
  @ApiResponse({ status: 404, description: 'Satıcı bulunamadı' })
  async getPublicSeller(@Param('id') id: string) {
    const seller = await this.userService.getPublicSeller(id);
    if (!seller) {
      throw new NotFoundException({
        code: RC.SELLER_NOT_FOUND,
        message: 'Satıcı bulunamadı',
      });
    }
    return {
      code: RC.SELLER_FETCHED,
      message: 'Satıcı getirildi',
      ...seller,
    };
  }

  // ==========================================
  // KVKK Onay
  // ==========================================

  @Get('consents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'KVKK onaylarını listele' })
  @ApiResponse({ status: 200, description: 'Onay listesi' })
  async getConsents(@CurrentUser('id') userId: string) {
    return this.userService.getConsents(userId);
  }

  @Post('consents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'KVKK onay ver veya geri çek' })
  @ApiResponse({ status: 201, description: 'Onay kaydedildi' })
  async createConsent(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateKvkkConsentDto,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.userService.createConsent(userId, dto, ip, userAgent);
  }

  // ==========================================
  // Hesap Silme / Geri Aktifleştirme
  // ==========================================

  @Delete('account')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hesap sil — 30 gün grace period' })
  @ApiResponse({ status: 200, description: 'Hesap silindi' })
  @ApiResponse({ status: 401, description: 'Şifre hatalı' })
  async deleteAccount(
    @CurrentUser('id') userId: string,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.userService.deleteAccount(userId, dto.password);
  }

  @Public()
  @Post('account/reactivate')
  @HttpCode(HttpStatus.OK)
  // CR-01: Strict rate limit — public endpoint accepting email+password
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Silinen hesabı geri aktifleştir — grace period içinde' })
  @ApiResponse({ status: 200, description: 'Hesap geri aktifleştirildi' })
  async reactivateAccount(
    @Body() dto: ReactivateAccountDto,
  ) {
    return this.userService.reactivateAccount(dto.email, dto.password);
  }
}
