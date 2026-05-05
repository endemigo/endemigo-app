import { IsNotEmpty, IsString } from 'class-validator';

export class PublishMobileConfigDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
