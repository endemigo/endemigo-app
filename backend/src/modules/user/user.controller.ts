import { Controller, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('become-seller')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Satıcı hesabına geçiş' })
  @ApiResponse({ status: 200, description: 'Satıcı oldunuz' })
  @ApiResponse({ status: 409, description: 'Zaten satıcısınız' })
  async becomeSeller(@CurrentUser('id') userId: string) {
    return this.userService.becomeSeller(userId);
  }
}
