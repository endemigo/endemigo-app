import { IsIn, IsOptional, IsString } from 'class-validator';

export const ADMIN_DASHBOARD_PERIODS = [
  'day',
  'week',
  'month',
  'custom',
] as const;
export type AdminDashboardPeriod = (typeof ADMIN_DASHBOARD_PERIODS)[number];

export class AdminDashboardQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(ADMIN_DASHBOARD_PERIODS)
  period?: AdminDashboardPeriod;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
