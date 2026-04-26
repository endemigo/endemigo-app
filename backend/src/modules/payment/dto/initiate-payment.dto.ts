import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class InitiatePaymentDto {
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
