import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class UpdateMobileConfigDraftDto {
  @IsObject()
  draft: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
