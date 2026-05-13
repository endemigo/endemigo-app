import { Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole, type MobileExperienceConfig } from '@endemigo/shared';
import { Public } from '../../common/decorators/public.decorator';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { PublishMobileConfigDto } from './dto/publish-mobile-config.dto';
import { UpdateMobileConfigDraftDto } from './dto/update-mobile-config-draft.dto';
import { MobileConfigService } from './mobile-config.service';

interface MobileConfigAdminRequest {
  adminUser: {
    id: string;
    roles: AdminRole[];
  };
}

@ApiTags('Mobile Config')
@Controller()
export class MobileConfigController {
  constructor(private readonly mobileConfigService: MobileConfigService) {}

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(
    AdminRole.SUPER_ADMIN,
    AdminRole.OPERATIONS,
    AdminRole.FINANCE,
    AdminRole.SUPPORT,
  )
  @ApiBearerAuth()
  @Get('admin/mobile-config/draft')
  @ApiOperation({ summary: 'Mobil uygulama taslagini getir' })
  async draft() {
    return this.mobileConfigService.getDraft();
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(
    AdminRole.SUPER_ADMIN,
    AdminRole.OPERATIONS,
    AdminRole.FINANCE,
    AdminRole.SUPPORT,
  )
  @ApiBearerAuth()
  @Patch('admin/mobile-config/draft')
  @ApiOperation({ summary: 'Mobil uygulama taslagini guncelle' })
  async updateDraft(
    @Body() body: UpdateMobileConfigDraftDto,
    @Request() request: MobileConfigAdminRequest,
  ) {
    return this.mobileConfigService.updateDraft({
      actorAdminId: request.adminUser.id,
      actorRoles: request.adminUser.roles,
      version: body.version,
      draft: body.draft as unknown as MobileExperienceConfig,
      reason: body.reason,
    });
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(
    AdminRole.SUPER_ADMIN,
    AdminRole.OPERATIONS,
    AdminRole.FINANCE,
    AdminRole.SUPPORT,
  )
  @ApiBearerAuth()
  @Post('admin/mobile-config/publish')
  @ApiOperation({ summary: 'Mobil uygulama taslagini yayina al' })
  async publish(
    @Body() body: PublishMobileConfigDto,
    @Request() request: MobileConfigAdminRequest,
  ) {
    return this.mobileConfigService.publish({
      actorAdminId: request.adminUser.id,
      actorRoles: request.adminUser.roles,
      version: body.version,
      reason: body.reason,
    });
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(
    AdminRole.SUPER_ADMIN,
    AdminRole.OPERATIONS,
    AdminRole.FINANCE,
    AdminRole.SUPPORT,
  )
  @ApiBearerAuth()
  @Get('admin/mobile-config/published')
  @ApiOperation({ summary: 'Mobil uygulama yayin snapshotini getir' })
  async published() {
    return this.mobileConfigService.getPublished();
  }

  @Public()
  @Get('mobile/config')
  @ApiOperation({ summary: 'Mobil uygulama yayin konfigurasyonunu getir' })
  async mobileConfig() {
    return this.mobileConfigService.getPublicConfig();
  }
}
