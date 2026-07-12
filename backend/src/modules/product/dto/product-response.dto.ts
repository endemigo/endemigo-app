import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductImageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() url: string;
  @ApiProperty() sortOrder: number;
  @ApiProperty() isPrimary: boolean;
}

export class ProductVariantOptionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() label: string;
  @ApiProperty() kind: string;
  @ApiPropertyOptional() swatchHex?: string | null;
  @ApiPropertyOptional() imageUrl?: string | null;
  @ApiPropertyOptional() inStock?: boolean;
  @ApiPropertyOptional() stockQuantity?: number | null;
}

export class ProductVariantSkuResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() colorVariantNumberId?: string | null;
  @ApiPropertyOptional() sizeVariantNumberId?: string | null;
  @ApiPropertyOptional() skuCode?: string | null;
  @ApiPropertyOptional() stockQuantity?: number;
  @ApiPropertyOptional() priceOverride?: number | null;
  @ApiPropertyOptional() imageUrl?: string | null;
  @ApiPropertyOptional() isActive?: boolean;
}

export class ProductItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() description: string;
  @ApiProperty({ nullable: true }) price: number | null;
  @ApiPropertyOptional() imageUrl: string;
  @ApiProperty({ type: [ProductImageResponseDto] })
  images: ProductImageResponseDto[];
  @ApiProperty() status: string;
  @ApiProperty() sellerId: string;
  @ApiPropertyOptional() categoryId: string;
  @ApiPropertyOptional() categoryName: string;
  @ApiPropertyOptional() geoIndicationType?: string;
  @ApiPropertyOptional({ type: [String] }) geoIndicationTypes?: string[];
  @ApiPropertyOptional() geoIndicationCertNo?: string;
  @ApiPropertyOptional() geoIndicationRegion?: string;
  @ApiPropertyOptional() deliveryTemplateDomestic?: string;
  @ApiPropertyOptional() deliveryTemplateInternational?: string;
  @ApiPropertyOptional() desiDomestic?: string;
  @ApiPropertyOptional() desiInternational?: string;
  @ApiPropertyOptional({ type: [String] }) featureBadges?: string[];
  @ApiPropertyOptional({ type: [String] }) geoBadgeSelections?: string[];
  @ApiPropertyOptional({ type: [ProductVariantOptionResponseDto] })
  variantOptions?: ProductVariantOptionResponseDto[];
  @ApiPropertyOptional({ type: [ProductVariantSkuResponseDto] })
  variantSkus?: ProductVariantSkuResponseDto[];
  @ApiPropertyOptional() askQuestionEnabled?: boolean;
  @ApiProperty() createdAt: Date;
}

export class ProductResponseDto extends ProductItemResponseDto {
  @ApiProperty() code: string;
  @ApiProperty() message: string;
  @ApiPropertyOptional() rating?: number;
  @ApiPropertyOptional() reviewCount?: number;
  @ApiPropertyOptional() latestReviewComment?: string | null;
  @ApiPropertyOptional({ type: [Object] }) reviews?: Array<
    Record<string, unknown>
  >;
}

export class PaginatedProductsDto {
  @ApiProperty() code: string;
  @ApiProperty() message: string;
  @ApiProperty({ type: [ProductItemResponseDto] })
  items: ProductItemResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() totalPages: number;
}
