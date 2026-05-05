import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminJwtGuard } from './guards/admin-jwt.guard';

interface AdminRequest {
  adminUser: {
    id: string;
  };
}

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @Post('login')
  // Route contract: POST('login')
  @ApiOperation({ summary: 'Admin girişi' })
  async login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aktif admin oturumu' })
  async me(@Request() request: AdminRequest) {
    return this.adminAuthService.getMe(request.adminUser.id);
  }
}
