import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsBoolean, MinLength, MaxLength, Equals, Matches } from 'class-validator';

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

  // WR-04: Turkish tax number validation (Vergi Kimlik Numarası — exactly 10 digits)
  @ApiPropertyOptional({ example: '1234567890', description: 'Vergi Kimlik Numarası (10 haneli)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Vergi Kimlik Numarası 10 haneli olmalıdır' })
  taxNumber?: string;

  // WR-05: Turkish IBAN format validation (TR + 24 digits)
  @ApiPropertyOptional({ example: 'TR330006100519786457841326', description: 'Türkiye IBAN (TR + 24 rakam)' })
  @IsOptional()
  @IsString()
  @Matches(/^TR\d{24}$/, { message: 'IBAN Türkiye formatında olmalıdır (TR + 24 rakam)' })
  iban?: string;

  @ApiProperty({ example: true, description: 'Satıcı sözleşmesi kabul edildi mi' })
  @IsBoolean()
  @Equals(true, { message: 'Satıcı sözleşmesini kabul etmelisiniz' })
  agreementAccepted: boolean;
}

