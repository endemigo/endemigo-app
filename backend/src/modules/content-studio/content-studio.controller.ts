import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AdminRole,
  type ContentStudioDocument,
} from '@endemigo/shared';
import { Public } from '../../common/decorators/public.decorator';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { ContentStudioService } from './content-studio.service';

interface ContentStudioAdminRequest {
  adminUser: {
    id: string;
    roles: AdminRole[];
  };
}

interface UpdateContentStudioBody {
  document: ContentStudioDocument;
  version: number;
  reason: string;
}

@ApiTags('Content Studio')
@Controller()
export class ContentStudioController {
  constructor(private readonly contentStudioService: ContentStudioService) {}

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(
    AdminRole.SUPER_ADMIN,
    AdminRole.OPERATIONS,
    AdminRole.FINANCE,
    AdminRole.SUPPORT,
  )
  @ApiBearerAuth()
  @Get('admin/content-studio')
  @ApiOperation({ summary: 'Icerik studyo dokumanini getir' })
  async document() {
    return this.contentStudioService.getDocument();
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
  @Patch('admin/content-studio')
  @ApiOperation({ summary: 'Icerik studyo dokumanini guncelle' })
  async update(
    @Body() body: UpdateContentStudioBody,
    @Request() request: ContentStudioAdminRequest,
  ) {
    return this.contentStudioService.updateDocument({
      actorAdminId: request.adminUser.id,
      actorRoles: request.adminUser.roles,
      document: body.document,
      version: body.version,
      reason: body.reason,
    });
  }

  @Public()
  @Get('blogs')
  @ApiOperation({ summary: 'Yayin bloglarini getir' })
  async publicBlogs() {
    return this.contentStudioService.getPublicBlogs();
  }
}
