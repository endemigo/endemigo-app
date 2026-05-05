import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AdPlacementType } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AdRequest } from './ad-request.entity';

@Entity('ad_placements')
export class AdPlacement extends BaseEntity {
  @Column()
  adRequestId: string;

  @ManyToOne(() => AdRequest, (request) => request.placements)
  @JoinColumn({ name: 'adRequestId' })
  adRequest: AdRequest;

  @Column({ type: 'enum', enum: AdPlacementType })
  placementType: AdPlacementType;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ type: 'varchar', nullable: true })
  slotKey: string | null;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  impressions: number;

  @Column({ type: 'int', default: 0 })
  clicks: number;
}
