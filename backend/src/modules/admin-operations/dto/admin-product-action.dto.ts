import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductStatus } from '@endemigo/shared';

export class AdminProductMetadataDto {
  @IsString()
  @IsOptional()
  sellerId?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  barcodeNo?: string;

  @IsString()
  @IsOptional()
  productContent?: string;

  @IsString()
  @IsOptional()
  sellerNotes?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  supplierName?: string;

  @IsBoolean()
  @IsOptional()
  isEndemigoBrandCandidate?: boolean;

  @IsString()
  @IsOptional()
  geoIndicationCertNo?: string;

  @IsString()
  @IsOptional()
  geoIndicationRegion?: string;

  @IsString()
  @IsOptional()
  geoIndicationReceivedAt?: string;

  @IsString()
  @IsOptional()
  originCountry?: string;

  @IsString()
  @IsOptional()
  originRegion?: string;

  @IsString()
  @IsOptional()
  productionProvince?: string;

  @IsString()
  @IsOptional()
  productionDistrict?: string;

  @IsString()
  @IsOptional()
  productionSeason?: string;

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(12)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @IsOptional()
  salesMonths?: number[];

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  wholesalePrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  retailPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  askPriceMinAmount?: number;

  @IsBoolean()
  @IsOptional()
  askPriceEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  askQuestionEnabled?: boolean;

  @IsString()
  @IsOptional()
  shippingProvince?: string;

  @IsString()
  @IsOptional()
  shippingDistrict?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  deliveryTemplateDomestic?: string;

  @IsString()
  @IsOptional()
  deliveryTemplateInternational?: string;

  @IsString()
  @IsOptional()
  desiDomestic?: string;

  @IsString()
  @IsOptional()
  desiInternational?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  featureBadges?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  geoBadgeSelections?: string[];

  @IsString()
  @IsOptional()
  certificateNotes?: string;

  @IsString()
  @IsOptional()
  certificateImageUrls?: string;

  @IsString()
  @IsOptional()
  deliveryLocations?: string;

  @IsString()
  @IsOptional()
  productImageUrls?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  weight?: number;

  @IsObject()
  @IsOptional()
  adminFormSnapshot?: Record<string, unknown>;
}

export class AdminProductActionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminProductMetadataDto)
  metadata?: AdminProductMetadataDto;
}
