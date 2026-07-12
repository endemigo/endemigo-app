import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  MinLength,
  MaxLength,
  Equals,
  Matches,
  ValidateIf,
} from 'class-validator';
import { SellerType } from '../entities/seller-profile.entity';

export class BecomeSellerDto {
  // Eski istemciler göndermez — service CORPORATE varsayar
  @ApiPropertyOptional({
    enum: SellerType,
    example: SellerType.INDIVIDUAL,
    description: 'Satıcı tipi: bireysel veya kurumsal',
  })
  @IsOptional()
  @IsEnum(SellerType, {
    message: 'Satıcı tipi INDIVIDUAL veya CORPORATE olmalıdır',
  })
  sellerType?: SellerType;

  @ApiProperty({
    example: 'Fatih Ticaret',
    description: 'İşletme adı (bireyselde ad soyad)',
  })
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
  @ApiPropertyOptional({
    example: '1234567890',
    description: 'Vergi Kimlik Numarası (10 haneli)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Vergi Kimlik Numarası 10 haneli olmalıdır' })
  taxNumber?: string;

  // Bireysel başvuruda TC Kimlik No zorunlu (11 hane, 0 ile başlayamaz)
  @ApiPropertyOptional({
    example: '12345678901',
    description: 'TC Kimlik Numarası (bireysel başvuruda zorunlu)',
  })
  @ValidateIf(
    (o: BecomeSellerDto) =>
      o.sellerType === SellerType.INDIVIDUAL || o.identityNumber !== undefined,
  )
  @IsNotEmpty({ message: 'Bireysel başvuruda TC Kimlik Numarası zorunludur' })
  @IsString()
  @Matches(/^[1-9]\d{10}$/, {
    message: 'TC Kimlik Numarası 11 haneli olmalıdır',
  })
  identityNumber?: string;

  // WR-05: Turkish IBAN format validation (TR + 24 digits)
  @ApiPropertyOptional({
    example: 'TR330006100519786457841326',
    description: 'Türkiye IBAN (TR + 24 rakam)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^TR\d{24}$/, {
    message: 'IBAN Türkiye formatında olmalıdır (TR + 24 rakam)',
  })
  iban?: string;

  @ApiProperty({
    example: true,
    description: 'Satıcı sözleşmesi kabul edildi mi',
  })
  @IsBoolean()
  @Equals(true, { message: 'Satıcı sözleşmesini kabul etmelisiniz' })
  agreementAccepted: boolean;
}
