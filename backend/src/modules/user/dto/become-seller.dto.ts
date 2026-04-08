import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class BecomeSellerDto {
  @ApiProperty({ example: 'Fatih Ticaret', description: 'İşletme adı' })
  @IsNotEmpty({ message: 'İşletme adı zorunludur' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  businessName: string;

  @ApiPropertyOptional({ example: 'Beşiktaş VD' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxOffice?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxNumber?: string;

  @ApiPropertyOptional({ example: 'TR330006100519786457841326' })
  @IsOptional()
  @IsString()
  @MaxLength(34)
  iban?: string;
}
