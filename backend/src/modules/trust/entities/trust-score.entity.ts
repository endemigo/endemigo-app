import { TrustBadgeLevel } from '@endemigo/shared';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('trust_scores')
export class TrustScore extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  sellerId: string;

  @Column({ type: 'integer', default: 0 })
  score: number;

  @Column({
    type: 'enum',
    enum: TrustBadgeLevel,
    enumName: 'trust_badge_level',
    default: TrustBadgeLevel.NEW,
  })
  badgeLevel: TrustBadgeLevel;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  transactionCompletionRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  paymentReliabilityScore: number;

  @Column({ type: 'integer', default: 0 })
  restrictionCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastCalculatedAt: Date | null;
}
