import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  IsDateString,
  Min,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductCondition } from '../../../shared/types/product-condition.enum';
import { ListingType } from '../../../shared/types/listing-type.enum';
import { GeoIndicationType } from '../../../shared/types/geo-indication-type.enum';
import { ProductProductionSeason } from '../../../shared/types/product-production-season.enum';

export class ProductVariantSkuInputDto {
  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsOptional()
  colorVariantNumberId?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  @IsOptional()
  sizeVariantNumberId?: string;

  @ApiPropertyOptional({ example: 'AYK-SIYAH-43' })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  skuCode?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsInt()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @ApiPropertyOptional({ example: 1233.5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  priceOverride?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

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

  @ApiPropertyOptional({ example: 45000, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  price?: number;

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

  @ApiPropertyOptional({ example: '8681234567890' })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  barcodeNo?: string;

  @ApiPropertyOptional({ example: 'Beden: L, Renk: Kırmızı' })
  @IsString()
  @IsOptional()
  productContent?: string;

  @ApiPropertyOptional({ example: 'Üreticiden özel notlar' })
  @IsString()
  @IsOptional()
  sellerNotes?: string;

  @ApiPropertyOptional({ example: 'Endemigo Select' })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isEndemigoBrandCandidate?: boolean;

  @ApiPropertyOptional({ example: 'CI-2024-001' })
  @IsString()
  @IsOptional()
  geoIndicationCertNo?: string;

  @ApiPropertyOptional({ example: 'Gaziantep' })
  @IsString()
  @IsOptional()
  geoIndicationRegion?: string;

  @ApiPropertyOptional({ example: '2026-05-07' })
  @IsDateString()
  @IsOptional()
  geoIndicationReceivedAt?: string;

  @ApiPropertyOptional({ enum: GeoIndicationType })
  @IsEnum(GeoIndicationType)
  @IsOptional()
  geoIndicationType?: GeoIndicationType;

  @ApiPropertyOptional({ enum: GeoIndicationType, isArray: true })
  @IsArray()
  @IsEnum(GeoIndicationType, { each: true })
  @IsOptional()
  geoIndicationTypes?: GeoIndicationType[];

  @ApiPropertyOptional({ example: 'TR', default: 'TR' })
  @IsString()
  @IsOptional()
  originCountry?: string;

  @ApiPropertyOptional({ example: 'Güneydoğu Anadolu' })
  @IsString()
  @IsOptional()
  originRegion?: string;

  @ApiPropertyOptional({ example: 'Gaziantep' })
  @IsString()
  @IsOptional()
  productionProvince?: string;

  @ApiPropertyOptional({ example: 'Şahinbey' })
  @IsString()
  @IsOptional()
  productionDistrict?: string;

  @ApiPropertyOptional({ enum: ProductProductionSeason, default: ProductProductionSeason.ALL_TIME })
  @IsEnum(ProductProductionSeason)
  @IsOptional()
  productionSeason?: ProductProductionSeason;

  @ApiPropertyOptional({ enum: ProductProductionSeason, isArray: true })
  @IsArray()
  @IsEnum(ProductProductionSeason, { each: true })
  @IsOptional()
  productionSeasons?: ProductProductionSeason[];

  @ApiPropertyOptional({ example: [1, 2, 3], isArray: true })
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(12)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @IsOptional()
  salesMonths?: number[];

  @ApiPropertyOptional({ enum: ProductCondition, default: ProductCondition.NEW })
  @IsEnum(ProductCondition)
  @IsOptional()
  condition?: ProductCondition;

  @ApiPropertyOptional({ enum: ListingType, default: ListingType.DIRECT_SALE })
  @IsEnum(ListingType)
  @IsOptional()
  listingType?: ListingType;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  askPriceEnabled?: boolean;

  @ApiPropertyOptional({ example: 15000 })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  askPriceMinAmount?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  wholesalePrice?: number;

  @ApiPropertyOptional({ example: 700 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  retailPrice?: number;

  @ApiPropertyOptional({ example: 'Gaziantep' })
  @IsString()
  @IsOptional()
  shippingProvince?: string;

  @ApiPropertyOptional({ example: 'Şahinbey' })
  @IsString()
  @IsOptional()
  shippingDistrict?: string;

  @ApiPropertyOptional({ example: 'Siparişin kargo teslim adresi' })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiPropertyOptional({ example: 'Yurtiçi Kargo 1-3 gün' })
  @IsString()
  @IsOptional()
  deliveryTemplateDomestic?: string;

  @ApiPropertyOptional({ example: 'UPS Kargo 3-7 gün' })
  @IsString()
  @IsOptional()
  deliveryTemplateInternational?: string;

  @ApiPropertyOptional({ example: '1-3' })
  @IsString()
  @IsOptional()
  desiDomestic?: string;

  @ApiPropertyOptional({ example: '3-5' })
  @IsString()
  @IsOptional()
  desiInternational?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  featureBadges?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  geoBadgeSelections?: string[];

  @ApiPropertyOptional({ example: 'ISO 22000, TSE Belgesi' })
  @IsString()
  @IsOptional()
  additionalCertificates?: string;

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

  @ApiPropertyOptional({ type: [ProductVariantSkuInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantSkuInputDto)
  @IsOptional()
  variantSkus?: ProductVariantSkuInputDto[];
}
