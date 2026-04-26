import { IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class RequestPayoutDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  idempotencyKey: string;

  @IsOptional()
  @IsObject()
  payoutMethodMetadata?: Record<string, unknown>;
}
