import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BannerActionType } from '@endemigo/shared';

export class BannerLocalizedTextDto {
  @IsString()
  @IsOptional()
  tr?: string;

  @IsString()
  @IsOptional()
  en?: string;
}

export class BannerItemDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsEnum(BannerActionType)
  actionType: BannerActionType;

  @IsString()
  actionValue: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BannerLocalizedTextDto)
  title?: BannerLocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BannerLocalizedTextDto)
  subtitle?: BannerLocalizedTextDto;

  @IsBoolean()
  @IsOptional()
  requireConfirmation?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => BannerLocalizedTextDto)
  confirmationText?: BannerLocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BannerLocalizedTextDto)
  confirmationButtonText?: BannerLocalizedTextDto;
}
