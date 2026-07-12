import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { RestrictionType } from '@endemigo/shared';

export enum TrustFlagReviewDecision {
  RESOLVE = 'RESOLVE',
  DISMISS = 'DISMISS',
}

export class ReviewTrustFlagDto {
  @IsEnum(TrustFlagReviewDecision)
  decision: TrustFlagReviewDecision;

  @IsString()
  @MinLength(3)
  reason: string;

  @IsOptional()
  @IsEnum(RestrictionType)
  restrictionType?: RestrictionType;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class ApplyAccountRestrictionDto {
  @IsUUID()
  targetUserId: string;

  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @IsEnum(RestrictionType)
  restrictionType: RestrictionType;

  @IsString()
  @MinLength(3)
  reason: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
