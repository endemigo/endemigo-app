import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, MaxLength, Matches, IsDateString, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Fatih' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Kartal' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: '+905551234567', description: 'E.164 format' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Telefon numarası E.164 formatında olmalıdır (+905551234567)' })
  phone?: string;

  // BIZ-15: Phase 5 prerequisite alanları — User entity'de var ama DTO'da eksikti
  @ApiPropertyOptional({ example: '1990-01-15', description: 'ISO 8601 date' })
  @IsOptional()
  @IsDateString({}, { message: 'Doğum tarihi ISO 8601 formatında olmalıdır' })
  birthDate?: string;

  @ApiPropertyOptional({ example: 'TR', description: 'ISO 3166-1 alpha-2 country code' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  nationality?: string;

  @ApiPropertyOptional({ example: 'https://cdn.endemigo.com/avatars/user123.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

