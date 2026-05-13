import { AddressType } from '@endemigo/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ enum: AddressType })
  @IsEnum(AddressType)
  type: AddressType;

  @ApiProperty({ example: 'Home' })
  @IsString()
  @Length(1, 60)
  title: string;

  @ApiProperty({ example: 'Ahmet Yilmaz' })
  @IsString()
  @Length(1, 120)
  fullName: string;

  @ApiProperty({ example: '+905551234567' })
  @IsString()
  @Length(6, 32)
  phone: string;

  @ApiProperty({ example: 'Istanbul' })
  @IsString()
  @Length(1, 80)
  city: string;

  @ApiProperty({ example: 'Kadikoy' })
  @IsString()
  @Length(1, 80)
  district: string;

  @ApiPropertyOptional({ example: 'Moda' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  neighborhood?: string;

  @ApiProperty({ example: 'Caferaga Mahallesi, Example Sokak No:12 D:3' })
  @IsString()
  @Length(5, 500)
  addressLine: string;

  @ApiPropertyOptional({ example: '34710' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: 'TR', default: 'TR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  country?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ enum: AddressType })
  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;

  @ApiPropertyOptional({ example: 'Office' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  title?: string;

  @ApiPropertyOptional({ example: 'Ayse Yilmaz' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  fullName?: string;

  @ApiPropertyOptional({ example: '+905551234567' })
  @IsOptional()
  @IsString()
  @Length(6, 32)
  phone?: string;

  @ApiPropertyOptional({ example: 'Ankara' })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  city?: string;

  @ApiPropertyOptional({ example: 'Cankaya' })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  district?: string;

  @ApiPropertyOptional({ example: 'Kizilay' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'Ataturk Bulvari No:20' })
  @IsOptional()
  @IsString()
  @Length(5, 500)
  addressLine?: string;

  @ApiPropertyOptional({ example: '06420' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: 'TR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
