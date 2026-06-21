import { IsOptional, IsString } from 'class-validator';

export class CheckoutInitiateDto {
  @IsString()
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
