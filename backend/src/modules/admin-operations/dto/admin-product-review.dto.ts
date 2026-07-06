import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * Ürün onay kuyruğu aksiyonu:
 * approve=true  → ürün ACTIVE (yayına alınır)
 * approve=false → ürün DRAFT (taslağa geri döner)
 */
export class AdminProductReviewDto {
  @IsBoolean()
  approve: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
