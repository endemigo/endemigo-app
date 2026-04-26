import { IsOptional, IsString } from 'class-validator';

export class IyzicoWebhookDto {
  @IsString()
  eventKey: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
