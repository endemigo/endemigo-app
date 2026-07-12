import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { MembershipPeriod, MembershipStatus } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MembershipPackage } from './membership-package.entity';

@Entity('membership_subscriptions')
export class MembershipSubscription extends BaseEntity {
  @Column()
  sellerId: string;

  @Column()
  packageId: string;

  @ManyToOne(
    () => MembershipPackage,
    (membershipPackage) => membershipPackage.subscriptions,
  )
  @JoinColumn({ name: 'packageId' })
  package: MembershipPackage;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.FREE,
  })
  status: MembershipStatus;

  @Column({
    type: 'enum',
    enum: MembershipPeriod,
    default: MembershipPeriod.MONTHLY,
  })
  period: MembershipPeriod;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  startsAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodEndsAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  graceEndsAt: Date | null;

  @Column({ default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ type: 'varchar', nullable: true })
  providerSubscriptionId: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;
}
