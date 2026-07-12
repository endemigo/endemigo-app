import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ListingType } from '../../../shared/types/listing-type.enum';
import { ListingDraftEntryMode } from '../../../shared/types/listing-draft-entry-mode.enum';

export class CreateListingDraftDto {
  @IsEnum(ListingDraftEntryMode)
  entryMode: ListingDraftEntryMode;

  @IsEnum(ListingType)
  listingType: ListingType;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsInt()
  @Min(1)
  @Max(12)
  currentStep: number;

  @IsObject()
  payload: Record<string, unknown>;
}

export class UpdateListingDraftDto {
  @IsOptional()
  @IsEnum(ListingDraftEntryMode)
  entryMode?: ListingDraftEntryMode;

  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  currentStep?: number;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
