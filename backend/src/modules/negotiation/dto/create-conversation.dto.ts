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

export class CreateConversationDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ example: 12500 })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ enum: [12, 24, 48, 72], default: 48 })
  @IsIn([12, 24, 48, 72])
  @IsOptional()
  expiresInHours?: 12 | 24 | 48 | 72;
}
