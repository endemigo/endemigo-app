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
  IsString,
  Matches,
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

  @ApiPropertyOptional({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  guaranteeAccepted?: boolean;
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

export class RegisterToAuctionDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  cardHolderName?: string;

  @ApiPropertyOptional({ example: '4111111111111111' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{15,16}$/, { message: 'Kart numarası 15 veya 16 haneli rakam olmalıdır' })
  cardNumber?: string;

  @ApiPropertyOptional({ example: '12' })
  @IsString()
  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'Geçersiz son kullanma ayı' })
  expireMonth?: string;

  @ApiPropertyOptional({ example: '2028' })
  @IsString()
  @IsOptional()
  @Matches(/^(\d{2}|\d{4})$/, { message: 'Geçersiz son kullanma yılı' })
  expireYear?: string;

  @ApiPropertyOptional({ example: '123' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{3,4}$/, { message: 'CVC 3 veya 4 haneli rakam olmalıdır' })
  cvc?: string;
}

