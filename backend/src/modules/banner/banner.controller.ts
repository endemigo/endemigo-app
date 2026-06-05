import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@endemigo/shared';
import { Public } from '../../common/decorators/public.decorator';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

interface BannerAdminRequest {
  adminUser: {
    id: string;
    roles: AdminRole[];
  };
}

@ApiTags('Banner Management')
@Controller()
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(
    AdminRole.SUPER_ADMIN,
    AdminRole.OPERATIONS,
  )
  @ApiBearerAuth()
  @Get('admin/banners')
  @ApiOperation({ summary: 'Tüm banner listesini getir' })
  async list() {
    return this.bannerService.listBanners();
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(
    AdminRole.SUPER_ADMIN,
    AdminRole.OPERATIONS,
  )
  @ApiBearerAuth()
  @Get('admin/banners/:id')
  @ApiOperation({ summary: 'Belirli bir banner detayını getir' })
  async get(@Param('id') id: string) {
    return this.bannerService.getBanner(id);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(
    AdminRole.SUPER_ADMIN,
    AdminRole.OPERATIONS,
  )
  @ApiBearerAuth()
  @Post('admin/banners')
  @ApiOperation({ summary: 'Yeni bir banner oluştur' })
  async create(
    @Body() dto: CreateBannerDto,
    @Body('reason') reason: string,
    @Request() request: BannerAdminRequest,
  ) {
    return this.bannerService.createBanner(dto, {
      actorAdminId: request.adminUser.id,
      actorRoles: request.adminUser.roles,
      reason: reason || 'Yeni banner oluşturuldu',
    });
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(
    AdminRole.SUPER_ADMIN,
    AdminRole.OPERATIONS,
  )
  @ApiBearerAuth()
  @Patch('admin/banners/:id')
  @ApiOperation({ summary: 'Bir bannerı güncelle' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
    @Body('reason') reason: string,
    @Request() request: BannerAdminRequest,
  ) {
    return this.bannerService.updateBanner(id, dto, {
      actorAdminId: request.adminUser.id,
      actorRoles: request.adminUser.roles,
      reason: reason || 'Banner güncellendi',
    });
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(
    AdminRole.SUPER_ADMIN,
    AdminRole.OPERATIONS,
  )
  @ApiBearerAuth()
  @Delete('admin/banners/:id')
  @ApiOperation({ summary: 'Bir bannerı sil (soft remove)' })
  async delete(
    @Param('id') id: string,
    @Query('reason') reason: string,
    @Request() request: BannerAdminRequest,
  ) {
    return this.bannerService.deleteBanner(id, {
      actorAdminId: request.adminUser.id,
      actorRoles: request.adminUser.roles,
      reason: reason || 'Banner silindi',
    });
  }

  @Public()
  @Get('mobile/banners/:idOrSlug')
  @ApiOperation({ summary: 'Mobil için banner bilgilerini getir' })
  async publicGet(@Param('idOrSlug') idOrSlug: string) {
    return this.bannerService.getPublicBanner(idOrSlug);
  }
}
