import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUUID, IsUrl, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro', minLength: 3 })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({ example: '256GB Space Black, kutusunda' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 45000, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  price: number;

  @ApiPropertyOptional({ example: 'https://placehold.co/400x400?text=iPhone' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
