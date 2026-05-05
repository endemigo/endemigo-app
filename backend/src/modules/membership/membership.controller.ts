import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@endemigo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { CreateMembershipPackageDto } from './dto/create-membership-package.dto';
import { StartMembershipUpgradeDto } from './dto/start-membership-upgrade.dto';
import { MembershipService } from './membership.service';

interface AdminMembershipRequest {
  adminUser: {
    id: string;
    roles: AdminRole[];
  };
}

@ApiTags('Membership')
@Controller()
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Public()
  @Get('membership/packages')
  @ApiOperation({ summary: 'Paketim paketleri' })
  async packages() {
    return this.membershipService.listPackages();
  }

  @Get('membership/me')
  @Roles('seller')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Satıcının Paketim aboneliği' })
  async me(@CurrentUser('id') sellerId: string) {
    return this.membershipService.getCurrentSubscription(sellerId);
  }

  @Post('membership/upgrade')
  // Route contract: Post('upgrade')
  @Roles('seller')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Paketim yükseltmesi başlat' })
  async upgrade(
    @CurrentUser('id') sellerId: string,
    @Body() dto: StartMembershipUpgradeDto,
  ) {
    return this.membershipService.startUpgrade(
      sellerId,
      dto.packageId,
      dto.period,
    );
  }

  @Post('membership/cancel')
  @Roles('seller')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Paketim iptalini dönem sonuna planla' })
  async cancel(@CurrentUser('id') sellerId: string) {
    return this.membershipService.requestDowngradeOrCancel(sellerId);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE)
  @Post('admin/membership/packages')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin Paketim paketi oluştur' })
  async createPackage(
    @Body() dto: CreateMembershipPackageDto,
    @Request() _request: AdminMembershipRequest,
  ) {
    return this.membershipService.createPackage(dto);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE)
  @Patch('admin/membership/packages/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin Paketim paketi güncelle' })
  async updatePackage(
    @Param('id') id: string,
    @Body() dto: Partial<CreateMembershipPackageDto>,
  ) {
    return this.membershipService.updatePackage(id, dto);
  }
}
