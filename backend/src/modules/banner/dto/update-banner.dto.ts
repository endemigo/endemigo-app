import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { BannerItem } from '@endemigo/shared';

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
  @IsOptional()
  items?: BannerItem[];
}
