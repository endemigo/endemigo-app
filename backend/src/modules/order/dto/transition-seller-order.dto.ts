import { OrderStatus } from '@endemigo/shared';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class TransitionSellerOrderDto {
  @ApiProperty({
    enum: [
      OrderStatus.PREPARING_SHIPMENT,
      OrderStatus.IN_TRANSIT,
      OrderStatus.DELIVERED,
    ],
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
