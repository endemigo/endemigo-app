import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { BannerItemDto } from './banner-item.dto';

export class UpdateBannerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsInt()
  @Min(500)
  @IsOptional()
  slideDuration?: number;

  @IsEnum(['16:9', '4:3', '1:1', '3:1'])
  @IsOptional()
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:1';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BannerItemDto)
  @IsOptional()
  items?: BannerItemDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsISO8601()
  @IsOptional()
  startAt?: string | null;

  @IsISO8601()
  @IsOptional()
  endAt?: string | null;

  @IsString()
  @IsOptional()
  reason?: string;
}
