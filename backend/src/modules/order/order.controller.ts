import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { RequestReturnDto } from './dto/request-return.dto';
import { ReviewReturnDto } from './dto/review-return.dto';
import { SubmitOrderReviewDto } from './dto/submit-order-review.dto';
import { TransitionSellerOrderDto } from './dto/transition-seller-order.dto';
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

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  getOrderDetail(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.orderService.getOrderDetail(id, userId);
  }

  @Post(':id/confirm-delivery')
  @ApiOperation({ summary: 'Confirm order delivery' })
  confirmDelivery(@CurrentUser('id') buyerId: string, @Param('id') id: string) {
    return this.orderService.confirmDelivery(id, buyerId);
  }

  @Post(':id/return-request')
  @ApiOperation({ summary: 'Create return request' })
  requestReturn(
    @CurrentUser('id') buyerId: string,
    @Param('id') id: string,
    @Body() dto: RequestReturnDto,
  ) {
    return this.orderService.requestReturn(id, buyerId, dto);
  }

  @Patch(':id/return-review')
  @Roles('seller', 'admin')
  @ApiOperation({ summary: 'Review return request' })
  reviewReturn(
    @CurrentUser() user: { id: string; isAdmin?: boolean },
    @Param('id') id: string,
    @Body() dto: ReviewReturnDto,
  ) {
    return this.orderService.reviewReturn(id, user, dto);
  }

  @Post(':id/confirm-return-delivered')
  @Roles('seller', 'admin')
  @ApiOperation({ summary: 'Confirm return shipment delivery and finalize refund' })
  confirmReturnDelivered(
    @CurrentUser() user: { id: string; isAdmin?: boolean },
    @Param('id') id: string,
  ) {
    return this.orderService.confirmReturnDelivered(id, user);
  }

  @Post(':id/refund-finalize')
  @Roles('admin')
  @ApiOperation({ summary: 'Finalize return refund manually' })
  finalizeRefund(
    @CurrentUser() user: { id: string; isAdmin?: boolean },
    @Param('id') id: string,
  ) {
    return this.orderService.finalizeReturnRefund(id, user.id);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Submit order review' })
  submitReview(
    @CurrentUser('id') buyerId: string,
    @Param('id') id: string,
    @Body() dto: SubmitOrderReviewDto,
  ) {
    return this.orderService.submitOrderReview(id, buyerId, dto);
  }

  @Patch(':id/seller-status')
  @Roles('seller')
  @ApiOperation({ summary: 'Advance seller order status' })
  transitionSellerOrder(
    @CurrentUser('id') sellerId: string,
    @Param('id') id: string,
    @Body() dto: TransitionSellerOrderDto,
  ) {
    return this.orderService.transitionSellerOrder(id, sellerId, dto.status);
  }
}
