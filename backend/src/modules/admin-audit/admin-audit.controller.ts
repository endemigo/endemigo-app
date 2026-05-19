import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuditAction, AdminRole } from '@endemigo/shared';
import { Public } from '../../common/decorators/public.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminAuditService } from './admin-audit.service';

@ApiTags('Admin Audit')
@Public()
@UseGuards(AdminJwtGuard)
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly adminAuditService: AdminAuditService) {}

  @Get()
  @ApiBearerAuth()
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  // Response code contract: ADMIN_AUDIT_FETCHED
  @ApiOperation({ summary: 'Admin audit kayıtlarını listele' })
  async list(
    @Query('actorAdminId') actorAdminId?: string,
    @Query('action') action?: AdminAuditAction,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminAuditService.list({
      actorAdminId,
      action,
      targetType,
      targetId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiBearerAuth()
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS)
  // Response code contract: ADMIN_AUDIT_FETCHED
  @ApiOperation({ summary: 'Admin audit detayını getir' })
  async detail(@Param('id') id: string) {
    return this.adminAuditService.detail(id);
  }
}
