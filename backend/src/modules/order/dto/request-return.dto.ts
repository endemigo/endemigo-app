import { OrderReturnReasonCode } from '@endemigo/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestReturnDto {
  @ApiProperty({ enum: OrderReturnReasonCode })
  @IsEnum(OrderReturnReasonCode)
  reasonCode: OrderReturnReasonCode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
