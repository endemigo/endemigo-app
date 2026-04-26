import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('direct-sale')
  @ApiOperation({ summary: 'Create direct sale order' })
  createDirectSale(@CurrentUser('id') buyerId: string, @Body() dto: CreateOrderDto) {
    return this.orderService.createFromDirectSale(buyerId, dto);
  }

  @Get('buyer')
  @ApiOperation({ summary: 'List buyer orders' })
  getBuyerOrders(@CurrentUser('id') buyerId: string) {
    return this.orderService.getBuyerOrders(buyerId);
  }

  @Get('seller')
  @Roles('seller')
  @ApiOperation({ summary: 'List seller orders' })
  getSellerOrders(@CurrentUser('id') sellerId: string) {
    return this.orderService.getSellerOrders(sellerId);
  }

  @Post(':id/confirm-delivery')
  @ApiOperation({ summary: 'Confirm order delivery' })
  confirmDelivery(@CurrentUser('id') buyerId: string, @Param('id') id: string) {
    return this.orderService.confirmDelivery(id, buyerId);
  }
}
