import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { UserService } from './user.service';
import { RC } from '../../shared/constants/response-codes';

@ApiTags('Sellers')
@Controller('sellers')
export class SellerController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Get(':id/reviews')
  @ApiOperation({ summary: 'Satıcı yorumlarını getir' })
  async getSellerReviews(@Param('id') id: string) {
    return this.userService.getSellerReviews(id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Satıcı profilini ve ürünlerini getir' })
  @ApiResponse({ status: 200, description: 'Satıcı profili ve ürün listesi' })
  @ApiResponse({ status: 404, description: 'Satıcı bulunamadı' })
  async getSeller(@Param('id') id: string) {
    const seller = await this.userService.getPublicSeller(id);
    if (!seller) {
      throw new NotFoundException({
        code: RC.SELLER_NOT_FOUND,
        message: 'Satıcı bulunamadı',
      });
    }
    return {
      code: RC.SELLER_FETCHED,
      message: 'Satıcı getirildi',
      ...seller,
    };
  }
}
