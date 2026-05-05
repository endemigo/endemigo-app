import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@endemigo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AdsService } from './ads.service';
import { AdSlotQueryDto } from './dto/ad-slot-query.dto';
import { CreateAdRequestDto } from './dto/create-ad-request.dto';
import { ReviewAdRequestDto } from './dto/review-ad-request.dto';
import { ScheduleAdRequestDto } from './dto/schedule-ad-request.dto';

interface AdminAdsRequest {
  adminUser: {
    id: string;
    roles: AdminRole[];
  };
}

@ApiTags('Ads')
@Controller()
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Public()
  @Get('ads/packages')
  @ApiOperation({ summary: 'Sabit reklam paketleri' })
  async packages() {
    return this.adsService.listPackages();
  }

  @Post('ads/requests')
  @Roles('seller')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Satıcı reklam talebi oluştur' })
  async createRequest(
    @CurrentUser('id') sellerId: string,
    @Body() dto: CreateAdRequestDto,
  ) {
    return this.adsService.createRequest(sellerId, dto);
  }

  @Get('ads/my-requests')
  @Roles('seller')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Satıcının reklam talepleri' })
  async myRequests(@CurrentUser('id') sellerId: string) {
    return this.adsService.listMyRequests(sellerId);
  }

  @Patch('ads/requests/:id/cancel')
  @Roles('seller')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yayın öncesi reklam talebi iptal et' })
  async cancelRequest(
    @CurrentUser('id') sellerId: string,
    @Param('id') id: string,
    @Body('reason') reason = 'Seller cancelled before publish',
  ) {
    return this.adsService.cancelBeforePublish(id, sellerId, reason);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE)
  @Get('admin/ads')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin reklam talepleri' })
  async adminRequests(
    @Query('page') page = '1',
    @Query('limit') limit = '25',
  ) {
    return this.adsService.listAdminRequests(Number(page), Number(limit));
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE)
  @Get('admin/ads/slot-calendar')
  // Route contract: Get('slot-calendar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin reklam slot takvimi' })
  async slotCalendar(@Query() query: AdSlotQueryDto) {
    return this.adsService.getSlotCalendar(query);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE)
  @Get('admin/ads/slot-conflicts')
  // Route contract: Get('slot-conflicts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin reklam slot çakışmaları' })
  async slotConflicts(@Query() query: AdSlotQueryDto) {
    return this.adsService.getSlotConflicts(query);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE)
  @Patch('admin/ads/requests/:id/approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reklam talebini onayla' })
  async approveRequest(
    @Param('id') id: string,
    @Body() dto: ScheduleAdRequestDto,
    @Request() request: AdminAdsRequest,
  ) {
    return this.adsService.approveRequest(id, dto, request.adminUser);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE)
  @Patch('admin/ads/requests/:id/reject')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reklam talebini reddet' })
  async rejectRequest(
    @Param('id') id: string,
    @Body() dto: ReviewAdRequestDto,
    @Request() request: AdminAdsRequest,
  ) {
    return this.adsService.rejectRequest(id, dto, request.adminUser);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE)
  @Patch('admin/ads/requests/:id/publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Onaylı reklamı yayına al' })
  async publishRequest(@Param('id') id: string) {
    return this.adsService.publishApprovedRequest(id);
  }
}
