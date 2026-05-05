import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CampaignDiscountType, CampaignScopeType } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Campaign } from './campaign.entity';

@Entity('campaign_rules')
export class CampaignRule extends BaseEntity {
  @Column()
  campaignId: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.rules)
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @Column({ type: 'enum', enum: CampaignDiscountType })
  discountType: CampaignDiscountType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  discountValue: number;

  @Column({ type: 'enum', enum: CampaignScopeType })
  scopeType: CampaignScopeType;

  @Column()
  scopeId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  minAmount: number | null;

  @Column({ type: 'int', nullable: true })
  minQuantity: number | null;

  @Column({ type: 'jsonb', default: [] })
  tiers: Array<Record<string, unknown>>;
}
