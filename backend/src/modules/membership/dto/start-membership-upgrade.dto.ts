import { IsEnum, IsUUID } from 'class-validator';
import { MembershipPeriod } from '@endemigo/shared';

export class StartMembershipUpgradeDto {
  @IsUUID()
  packageId: string;

  @IsEnum(MembershipPeriod)
  period: MembershipPeriod;
}
