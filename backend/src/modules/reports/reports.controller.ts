import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@endemigo/shared';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import type { ExportFormat } from './export.service';
import { ReportsService } from './reports.service';
import type { ReportQuery, ReportType } from './reports.service';

@ApiTags('Admin Reports')
@Public()
@UseGuards(AdminJwtGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE)
@ApiBearerAuth()
@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':type')
  async getReport(
    @Param('type') type: ReportType,
    @Query() query: ReportQuery,
  ) {
    return this.reportsService.getReport(type, query);
  }

  @Get(':type/export')
  async exportReport(
    @Param('type') type: ReportType,
    @Query('format') format: ExportFormat = 'csv',
    @Query() query: ReportQuery,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.reportsService.exportReport(type, format, query);
    response.setHeader('Content-Type', result.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    response.setHeader('X-Response-Code', result.code);
    response.setHeader(
      'X-Response-Message',
      encodeURIComponent(result.message),
    );
    return result.file;
  }
}
