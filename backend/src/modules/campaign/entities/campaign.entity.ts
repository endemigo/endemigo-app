import { Column, Entity, OneToMany } from 'typeorm';
import { CampaignStatus } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CampaignRule } from './campaign-rule.entity';

@Entity('campaigns')
export class Campaign extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  sellerId: string | null;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ default: false })
  isPlatform: boolean;

  @Column({ default: false })
  requiresSellerOptIn: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @OneToMany(() => CampaignRule, (rule) => rule.campaign)
  rules: CampaignRule[];
}
