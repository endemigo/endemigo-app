import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class AdminActionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
