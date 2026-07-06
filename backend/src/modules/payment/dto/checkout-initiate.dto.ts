import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CheckoutInitiateDto {
  @IsString()
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;

  // Verilmezse kullanıcının varsayılan teslimat adresi kullanılır.
  @IsOptional()
  @IsUUID()
  shippingAddressId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;
}

export class CheckoutQuoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;
}
