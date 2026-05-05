import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@endemigo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { AdminCartQueryDto } from './dto/admin-cart-query.dto';
import { CartService } from './cart.service';

interface AdminCartRequest {
  adminUser: {
    id: string;
    roles: AdminRole[];
  };
}

@ApiTags('Cart')
@Controller()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('cart')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kullanıcının sepetini getir' })
  async getMyCart(@CurrentUser('id') userId: string) {
    return this.cartService.getMyCart(userId);
  }

  @Post('cart/items')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sepete ürün ekle' })
  async addItem(
    @CurrentUser('id') userId: string,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(userId, dto);
  }

  @Patch('cart/items/:itemId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sepet ürün adedini güncelle' })
  async updateItem(
    @CurrentUser('id') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(userId, itemId, dto);
  }

  @Delete('cart/items/:itemId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sepetten ürün sil' })
  async removeItem(
    @CurrentUser('id') userId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem(userId, itemId);
  }

  @Delete('cart')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sepeti temizle' })
  async clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.SUPPORT)
  @ApiBearerAuth()
  @Get('admin/carts')
  @ApiOperation({ summary: 'Admin: kullanıcı bazlı sepet özeti' })
  async listAdminCarts(
    @Query() query: AdminCartQueryDto,
    @Request() req: AdminCartRequest,
  ) {
    return this.cartService.listAdminCarts(query, req.adminUser);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.SUPPORT)
  @ApiBearerAuth()
  @Get('admin/carts/items')
  @ApiOperation({ summary: 'Admin: sepet kalemlerini tarih ve kullanıcıya göre getir' })
  async listAdminCartItems(
    @Query() query: AdminCartQueryDto,
    @Request() req: AdminCartRequest,
  ) {
    return this.cartService.listAdminCartItems(query, req.adminUser);
  }
}
