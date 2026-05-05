import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignDiscountType, CampaignScopeType } from '@endemigo/shared';

export class CreateCampaignRuleDto {
  @IsEnum(CampaignDiscountType)
  discountType: CampaignDiscountType;

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsEnum(CampaignScopeType)
  scopeType: CampaignScopeType;

  @IsUUID()
  scopeId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minQuantity?: number;

  @IsOptional()
  @IsArray()
  tiers?: Array<Record<string, unknown>>;
}

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsBoolean()
  isPlatform?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresSellerOptIn?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCampaignRuleDto)
  rules: CreateCampaignRuleDto[];
}
