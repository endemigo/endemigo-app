import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { IyzicoWebhookDto } from './dto/iyzico-webhook.dto';
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
}
