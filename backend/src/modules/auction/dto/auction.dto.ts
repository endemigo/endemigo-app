import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { AuctionType } from '@endemigo/shared';

export class CreateAuctionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 1000, minimum: 1 })
  @IsNumber()
  @Min(1)
  startPrice: number;

  @ApiPropertyOptional({ example: 100, minimum: 0.01, default: 1 })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  minIncrement?: number;

  @ApiPropertyOptional({ example: 1500, minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  reservePrice?: number;

  @ApiPropertyOptional({
    example: 0.25,
    minimum: 0,
    maximum: 1,
    default: 0.25,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  buyerPremiumRate?: number;

  @ApiPropertyOptional({ enum: AuctionType, default: AuctionType.REALTIME })
  @IsEnum(AuctionType)
  @IsOptional()
  auctionType?: AuctionType;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  antiSnipingEnabled?: boolean;

  @ApiPropertyOptional({
    example: 60,
    minimum: 30,
    maximum: 120,
    default: 60,
  })
  @IsNumber()
  @Min(30)
  @Max(120)
  @IsOptional()
  extensionSeconds?: number;

  @ApiPropertyOptional({
    example: 5,
    minimum: 1,
    maximum: 10,
    default: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxExtensions?: number;

  @ApiProperty({ example: '2026-04-08T12:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-04-08T13:00:00Z' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  culturalAssetRestricted?: boolean;
}

export class PlaceBidDto {
  @ApiProperty({ example: 1100, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 1500, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  maxAmount?: number;
}
