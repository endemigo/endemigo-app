import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '@endemigo/shared';

export class InitiatePaymentDto {
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;

  @IsString()
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
