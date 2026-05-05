import { IsInt, IsObject, IsOptional, IsString, IsUUID, Max, Min, MinLength, IsEnum } from 'class-validator';
import { TrustFlagType } from '../entities/trust-flag.entity';

export class CreateTrustFlagDto {
  @IsUUID()
  targetUserId: string;

  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @IsEnum(TrustFlagType)
  flagType: TrustFlagType;

  @IsInt()
  @Min(1)
  @Max(5)
  severity: number;

  @IsObject()
  evidence: Record<string, unknown>;

  @IsString()
  @MinLength(3)
  reason: string;
}
