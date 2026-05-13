import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({
    description: 'Aynı ürünün farklı varyasyonlarını ayırmak için varyant ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  variantId?: string;

  @ApiPropertyOptional({
    description: 'Ürünün renk+numara kombinasyonunu temsil eden SKU ID',
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  @IsUUID()
  @IsOptional()
  productVariantSkuId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;
}
