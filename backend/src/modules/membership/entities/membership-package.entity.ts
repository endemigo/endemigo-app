import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MembershipSubscription } from './membership-subscription.entity';

@Entity('membership_packages')
export class MembershipPackage extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monthlyPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  yearlyPrice: number;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency: string;

  @Column({ type: 'jsonb', default: {} })
  benefits: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @OneToMany(
    () => MembershipSubscription,
    (subscription) => subscription.package,
  )
  subscriptions: MembershipSubscription[];
}
