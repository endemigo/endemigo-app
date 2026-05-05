import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  CampaignDiscountType,
  CampaignScopeType,
} from '@endemigo/shared';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(CampaignDiscountType)
  discountType: CampaignDiscountType;

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  perUserLimit?: number;

  @IsOptional()
  @IsEnum(CampaignScopeType)
  scopeType?: CampaignScopeType;

  @IsOptional()
  @IsUUID()
  scopeId?: string;
}
