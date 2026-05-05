import { RestrictionStatus, RestrictionType } from '@endemigo/shared';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('account_restrictions')
export class AccountRestriction extends BaseEntity {
  @Column({ type: 'uuid' })
  targetUserId: string;

  @Column({ type: 'uuid', nullable: true })
  sellerId: string | null;

  @Column({ type: 'enum', enum: RestrictionType, enumName: 'restriction_type' })
  restrictionType: RestrictionType;

  @Column({
    type: 'enum',
    enum: RestrictionStatus,
    enumName: 'restriction_status',
    default: RestrictionStatus.PENDING_REVIEW,
  })
  status: RestrictionStatus;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  startsAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;
}
