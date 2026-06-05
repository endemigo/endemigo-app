import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import type { BannerItem } from '@endemigo/shared';

export class CreateBannerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsInt()
  @Min(500)
  @IsOptional()
  slideDuration?: number;

  @IsEnum(['16:9', '4:3', '1:1', '3:1'])
  @IsOptional()
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:1';

  @IsArray()
  items: BannerItem[];
}
