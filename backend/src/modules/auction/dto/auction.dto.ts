import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

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

  @ApiProperty({ example: '2026-04-08T12:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-04-08T13:00:00Z' })
  @IsDateString()
  endTime: string;
}

export class PlaceBidDto {
  @ApiProperty({ example: 1100, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;
}
