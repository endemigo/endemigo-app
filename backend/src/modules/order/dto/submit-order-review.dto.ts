import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SubmitOrderReviewDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  productRating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  productComment?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  sellerRating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  sellerComment?: string;
}
