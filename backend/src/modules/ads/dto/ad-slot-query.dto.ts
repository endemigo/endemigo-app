import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AdPlacementType } from '@endemigo/shared';

export class AdSlotQueryDto {
  @IsEnum(AdPlacementType)
  placementType: AdPlacementType;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  slotKey?: string;

  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
