import { IsIn, IsOptional, IsString } from 'class-validator';

export const ADMIN_USER_RELATED_SECTIONS = [
  'orders',
  'sales',
  'favorites',
  'cart',
  'coupon-definitions',
  'coupon-usage',
] as const;

export type AdminUserRelatedSection = (typeof ADMIN_USER_RELATED_SECTIONS)[number];

export class AdminUserRelatedQueryDto {
  @IsString()
  @IsIn(ADMIN_USER_RELATED_SECTIONS)
  section!: AdminUserRelatedSection;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

