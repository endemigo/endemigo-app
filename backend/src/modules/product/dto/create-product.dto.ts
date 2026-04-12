import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ProductCondition } from '../../../shared/types/product-condition.enum';
import { ListingType } from '../../../shared/types/listing-type.enum';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro', minLength: 3, maxLength: 200 })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: '256GB Space Black, kutusunda' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 45000, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  price: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  // Phase 3 fields

  @ApiPropertyOptional({ example: 10 })
  @IsInt()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @ApiPropertyOptional({ example: 'SKU-001' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ example: 'CI-2024-001' })
  @IsString()
  @IsOptional()
  geoIndicationCertNo?: string;

  @ApiPropertyOptional({ example: 'Gaziantep' })
  @IsString()
  @IsOptional()
  geoIndicationRegion?: string;

  @ApiPropertyOptional({ example: 'TR', default: 'TR' })
  @IsString()
  @IsOptional()
  originCountry?: string;

  @ApiPropertyOptional({ example: 'Güneydoğu Anadolu' })
  @IsString()
  @IsOptional()
  originRegion?: string;

  @ApiPropertyOptional({ enum: ProductCondition, default: ProductCondition.NEW })
  @IsEnum(ProductCondition)
  @IsOptional()
  condition?: ProductCondition;

  @ApiPropertyOptional({ enum: ListingType, default: ListingType.DIRECT_SALE })
  @IsEnum(ListingType)
  @IsOptional()
  listingType?: ListingType;

  @ApiPropertyOptional({ example: 120.5, description: 'Genişlik (cm)' })
  @IsNumber()
  @IsOptional()
  dimensionWidth?: number;

  @ApiPropertyOptional({ example: 80, description: 'Yükseklik (cm)' })
  @IsNumber()
  @IsOptional()
  dimensionHeight?: number;

  @ApiPropertyOptional({ example: 5, description: 'Derinlik (cm)' })
  @IsNumber()
  @IsOptional()
  dimensionDepth?: number;

  @ApiPropertyOptional({ example: 2.5, description: 'Ağırlık (kg)' })
  @IsNumber()
  @IsOptional()
  weight?: number;
}
