import { VariantNumberStatus, VariantOptionKind } from '@endemigo/shared';
import {
  IsEnum,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAdminVariantNumberDto {
  @IsOptional()
  @IsEnum(VariantOptionKind)
  kind?: VariantOptionKind;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameTr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameEn?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @IsOptional()
  @IsEnum(VariantNumberStatus)
  status?: VariantNumberStatus;

  @IsOptional()
  @IsString()
  @IsHexColor()
  swatchHex?: string;
}
