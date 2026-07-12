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
import { CampaignService } from './campaign.service';
import { AdminCouponListQueryDto } from './dto/admin-coupon-list-query.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import {
  UpdateCouponDto,
  UpdateCouponStatusDto,
} from './dto/update-coupon.dto';

interface AdminCampaignRequest {
  adminUser: {
    id: string;
    roles: AdminRole[];
  };
}

@ApiTags('Campaigns')
@Controller()
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post('campaigns')
  @Roles('seller')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Satıcı kampanyası oluştur' })
  async createCampaign(
    @CurrentUser('id') sellerId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignService.createCampaign(sellerId, {
      ...dto,
      isPlatform: false,
    });
  }

  @Get('campaigns/my')
  @Roles('seller')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Satıcının kampanyaları' })
  async myCampaigns(@CurrentUser('id') sellerId: string) {
    return this.campaignService.listMyCampaigns(sellerId);
  }

  @Post('campaigns/:id/opt-in')
  // Route contract: Post(':id/opt-in')
  @Roles('seller')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Platform kampanyasına opt-in' })
  async optIn(@CurrentUser('id') sellerId: string, @Param('id') id: string) {
    return this.campaignService.optInPlatformCampaign(sellerId, id);
  }

  @Post('coupons')
  @Roles('seller')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Satıcı kuponu oluştur' })
  async createCoupon(
    @CurrentUser('id') sellerId: string,
    @Body() dto: CreateCouponDto,
  ) {
    return this.campaignService.createCoupon(sellerId, dto);
  }

  @Get('coupons/my')
  @Roles('seller')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Satıcının kuponları' })
  async myCoupons(@CurrentUser('id') sellerId: string) {
    return this.campaignService.listMyCoupons(sellerId);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE)
  @Post('admin/campaigns')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin platform kampanyası oluştur' })
  async createPlatformCampaign(
    @Body() dto: CreateCampaignDto,
    @Request() _request: AdminCampaignRequest,
  ) {
    return this.campaignService.createCampaign(
      null,
      {
        ...dto,
        isPlatform: true,
      },
      { adminPlatform: true },
    );
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE)
  @Get('admin/coupons')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin kupon listesi' })
  async adminCoupons(@Query() query: AdminCouponListQueryDto) {
    return this.campaignService.listAdminCoupons(query);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE)
  @Patch('admin/coupons/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin kupon güncelle' })
  async updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.campaignService.updateCoupon(id, dto);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE)
  @Patch('admin/coupons/:id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin kupon durum güncelle' })
  async updateCouponStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCouponStatusDto,
  ) {
    return this.campaignService.updateCouponStatus(id, dto.status);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE)
  @Post('admin/coupons')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin platform kuponu oluştur' })
  async createPlatformCoupon(@Body() dto: CreateCouponDto) {
    return this.campaignService.createCoupon(null, dto);
  }
}
