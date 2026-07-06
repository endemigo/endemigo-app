import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PublishMobileConfigDto {
  @IsInt()
  @Min(1)
  version: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
