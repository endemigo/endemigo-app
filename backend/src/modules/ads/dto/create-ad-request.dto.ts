import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAdRequestDto {
  @IsUUID()
  packageId: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  slotKey?: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
