import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum TrustFlagType {
  IP_DEVICE = 'IP_DEVICE',
  PHONE = 'PHONE',
  OFF_PLATFORM = 'OFF_PLATFORM',
  PAYMENT = 'PAYMENT',
  ORDER = 'ORDER',
  MANUAL = 'MANUAL',
}

export enum TrustFlagStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

@Entity('trust_flags')
export class TrustFlag extends BaseEntity {
  @Column({ type: 'uuid' })
  targetUserId: string;

  @Column({ type: 'uuid', nullable: true })
  sellerId: string | null;

  @Column({ type: 'enum', enum: TrustFlagType, enumName: 'trust_flag_type' })
  flagType: TrustFlagType;

  @Column({ type: 'integer', default: 1 })
  severity: number;

  @Column({
    type: 'enum',
    enum: TrustFlagStatus,
    enumName: 'trust_flag_status',
    default: TrustFlagStatus.PENDING_REVIEW,
  })
  status: TrustFlagStatus;

  @Column({ type: 'jsonb', default: {} })
  evidence: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  reviewReason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;
}
