import { Body, Controller, Headers, Param, Post, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { IyzicoWebhookDto } from './dto/iyzico-webhook.dto';
import { CheckoutInitiateDto, CheckoutQuoteDto } from './dto/checkout-initiate.dto';
import { RegisterCardDto } from './dto/register-card.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate payment checkout' })
  initiate(@CurrentUser('id') userId: string, @Body() dto: InitiatePaymentDto) {
    return this.paymentService.initiatePayment(userId, dto);
  }

  @Post('checkout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate cart payment checkout' })
  checkout(@CurrentUser('id') userId: string, @Body() dto: CheckoutInitiateDto) {
    return this.paymentService.checkoutCart(userId, dto);
  }

  @Post('checkout/quote')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview cart totals (discount, shipping, fees)' })
  quote(@CurrentUser('id') userId: string, @Body() dto: CheckoutQuoteDto) {
    return this.paymentService.quoteCheckout(userId, dto);
  }

  @Public()
  @Post('iyzico/webhook')
  @ApiOperation({ summary: 'Iyzico webhook callback' })
  handleIyzicoWebhook(
    @Body() dto: IyzicoWebhookDto,
    @Headers('x-iyz-signature-v3') signature?: string,
  ) {
    return this.paymentService.handleIyzicoWebhook(dto, signature);
  }

  @Post(':id/refund')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request payment refund' })
  refund(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.paymentService.requestRefund(id, userId);
  }

  @Get('cards')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List saved cards' })
  getSavedCards(@CurrentUser('id') userId: string) {
    return this.paymentService.listSavedCards(userId);
  }

  @Post('cards')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register and verify a new card' })
  registerCard(@CurrentUser('id') userId: string, @Body() dto: RegisterCardDto) {
    return this.paymentService.registerCard(userId, dto);
  }

  @Post('deposits')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay deposit to increase bidding limit' })
  payDeposit(@CurrentUser('id') userId: string, @Body() dto: { amount: number; cardDetails?: RegisterCardDto }) {
    return this.paymentService.payDeposit(userId, dto);
  }
}

