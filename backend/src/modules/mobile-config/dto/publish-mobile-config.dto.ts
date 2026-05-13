import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class PublishMobileConfigDto {
  @IsInt()
  @Min(1)
  version: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
