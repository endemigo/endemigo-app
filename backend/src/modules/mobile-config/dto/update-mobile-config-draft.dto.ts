import { IsInt, IsNotEmpty, IsObject, IsString, Min } from 'class-validator';

export class UpdateMobileConfigDraftDto {
  @IsInt()
  @Min(1)
  version: number;

  @IsObject()
  draft: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
