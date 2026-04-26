import { IsOptional, IsString } from 'class-validator';

export class ReviewPayoutDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  manualPayoutReference?: string;
}
