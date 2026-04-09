import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsNumber, IsEnum, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductCondition } from '../../../shared/types/product-condition.enum';
import { ListingType } from '../../../shared/types/listing-type.enum';

export class SearchProductsDto {
  @ApiPropertyOptional({ description: 'Arama terimi (title + description)' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ example: 50000 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ enum: ProductCondition })
  @IsEnum(ProductCondition)
  @IsOptional()
  condition?: ProductCondition;

  @ApiPropertyOptional({ enum: ListingType })
  @IsEnum(ListingType)
  @IsOptional()
  listingType?: ListingType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  originCountry?: string;

  @ApiPropertyOptional({ description: 'Sadece stokta olanlar' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @ApiPropertyOptional({ enum: ['newest', 'price_asc', 'price_desc', 'popular'], default: 'newest' })
  @IsString()
  @IsOptional()
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class SearchAuctionsDto {
  @ApiPropertyOptional({ description: 'Arama terimi' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ enum: ['active', 'upcoming', 'ended'] })
  @IsString()
  @IsOptional()
  status?: 'active' | 'upcoming' | 'ended';

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ enum: ['ending_soon', 'newest', 'price_asc', 'most_bids'], default: 'newest' })
  @IsString()
  @IsOptional()
  sort?: 'ending_soon' | 'newest' | 'price_asc' | 'most_bids';

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;
}
