import { VariantNumberStatus, VariantOptionKind } from '@endemigo/shared';
import {
  IsEnum,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAdminVariantNumberDto {
  @IsEnum(VariantOptionKind)
  kind: VariantOptionKind;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nameTr: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nameEn: string;

  @IsInt()
  @Min(1)
  sortOrder: number;

  @IsEnum(VariantNumberStatus)
  status: VariantNumberStatus;

  @IsOptional()
  @IsString()
  @IsHexColor()
  swatchHex?: string;
}
