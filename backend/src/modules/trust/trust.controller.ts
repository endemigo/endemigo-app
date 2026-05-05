import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@endemigo/shared';
import { Public } from '../../common/decorators/public.decorator';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { CreateTrustFlagDto } from './dto/create-trust-flag.dto';
import {
  ApplyAccountRestrictionDto,
  ReviewTrustFlagDto,
} from './dto/review-trust-flag.dto';
import { TrustService } from './trust.service';

interface AdminRequest {
  adminUser: {
    id: string;
    roles: AdminRole[];
  };
}

interface ResolveRestrictionDto {
  reason: string;
}

@ApiTags('Admin Trust')
@Public()
@UseGuards(AdminJwtGuard)
@AdminRoles(
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.FINANCE,
  AdminRole.SUPPORT,
)
@ApiBearerAuth()
@Controller('admin/trust')
export class TrustController {
  constructor(private readonly trustService: TrustService) {}

  @Post('flags')
  async createFlag(
    @Body() dto: CreateTrustFlagDto,
    @Request() request: AdminRequest,
  ) {
    return this.trustService.createFlag(dto, request.adminUser);
  }

  @Patch('flags/:id/review')
  async reviewFlag(
    @Param('id') id: string,
    @Body() dto: ReviewTrustFlagDto,
    @Request() request: AdminRequest,
  ) {
    return this.trustService.reviewFlag(id, dto, request.adminUser);
  }

  @Post('restrictions')
  async applyRestriction(
    @Body() dto: ApplyAccountRestrictionDto,
    @Request() request: AdminRequest,
  ) {
    return this.trustService.applyRestriction(dto, request.adminUser);
  }

  @Patch('restrictions/:id/resolve')
  async resolveRestriction(
    @Param('id') id: string,
    @Body() dto: ResolveRestrictionDto,
    @Request() request: AdminRequest,
  ) {
    return this.trustService.resolveRestriction(id, dto.reason, request.adminUser);
  }
}
