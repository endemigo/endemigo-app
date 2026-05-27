import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class GenerateListingContentDto {
  @ApiProperty({ example: 'Taş Baskı Soğuk Sıkım Sızma Zeytinyağı 1L', minLength: 3, maxLength: 200 })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Zeytinyağı & Gurme Lezzetler' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  categoryName?: string;
}
