import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() description: string;
  @ApiProperty() price: number;
  @ApiPropertyOptional() imageUrl: string;
  @ApiProperty() status: string;
  @ApiProperty() sellerId: string;
  @ApiPropertyOptional() categoryId: string;
  @ApiPropertyOptional() categoryName: string;
  @ApiProperty() createdAt: Date;
}

export class PaginatedProductsDto {
  @ApiProperty({ type: [ProductResponseDto] }) items: ProductResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() totalPages: number;
}
