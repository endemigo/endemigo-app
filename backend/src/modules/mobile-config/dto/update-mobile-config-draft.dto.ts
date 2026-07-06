import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateMobileConfigDraftDto {
  @IsInt()
  @Min(1)
  version: number;

  @IsObject()
  draft: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reason?: string;
}
