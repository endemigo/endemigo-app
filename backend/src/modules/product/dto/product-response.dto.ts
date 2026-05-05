import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductImageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() url: string;
  @ApiProperty() sortOrder: number;
  @ApiProperty() isPrimary: boolean;
}

export class ProductItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() description: string;
  @ApiProperty({ nullable: true }) price: number | null;
  @ApiPropertyOptional() imageUrl: string;
  @ApiProperty({ type: [ProductImageResponseDto] }) images: ProductImageResponseDto[];
  @ApiProperty() status: string;
  @ApiProperty() sellerId: string;
  @ApiPropertyOptional() categoryId: string;
  @ApiPropertyOptional() categoryName: string;
  @ApiProperty() createdAt: Date;
}

export class ProductResponseDto extends ProductItemResponseDto {
  @ApiProperty() code: string;
  @ApiProperty() message: string;
}

export class PaginatedProductsDto {
  @ApiProperty() code: string;
  @ApiProperty() message: string;
  @ApiProperty({ type: [ProductItemResponseDto] }) items: ProductItemResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() totalPages: number;
}
