import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole, AdminSettingKey } from '@endemigo/shared';
import { Public } from '../../common/decorators/public.decorator';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AdminSettingsService } from './admin-settings.service';

interface AdminRequest {
  adminUser: {
    id: string;
    roles: AdminRole[];
  };
}

interface UpdateAdminSettingBody {
  value: Record<string, unknown>;
  reason: string;
}

@ApiTags('Admin Settings')
@Public()
@UseGuards(AdminJwtGuard)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin ayarlarını listele' })
  async list() {
    return this.adminSettingsService.list();
  }

  @Patch(':key')
  // Route contract: PATCH(':key')
  @ApiBearerAuth()
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE, AdminRole.OPERATIONS)
  @ApiOperation({ summary: 'Admin ayarı güncelle' })
  async update(
    @Param('key') key: AdminSettingKey,
    @Body() body: UpdateAdminSettingBody,
    @Request() request: AdminRequest,
  ) {
    return this.adminSettingsService.update({
      actorAdminId: request.adminUser.id,
      actorRoles: request.adminUser.roles,
      key,
      value: body.value,
      reason: body.reason,
    });
  }
}
