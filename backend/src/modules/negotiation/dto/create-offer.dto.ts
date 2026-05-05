import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOfferDto {
  @ApiProperty({ example: 12500 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ enum: [12, 24, 48, 72], default: 48 })
  @IsIn([12, 24, 48, 72])
  @IsOptional()
  expiryHours?: 12 | 24 | 48 | 72;

  @ApiPropertyOptional({ enum: [12, 24, 48, 72], default: 48 })
  @IsIn([12, 24, 48, 72])
  @IsOptional()
  expiresInHours?: 12 | 24 | 48 | 72;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parentOfferId?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  note?: string;
}
