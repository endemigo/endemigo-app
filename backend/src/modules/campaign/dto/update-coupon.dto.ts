import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  CampaignDiscountType,
  CampaignScopeType,
  CouponStatus,
} from '@endemigo/shared';

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(CampaignDiscountType)
  discountType?: CampaignDiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

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

export class UpdateCouponStatusDto {
  @IsEnum(CouponStatus)
  status: CouponStatus;
}
