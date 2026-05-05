import { Column, Entity, OneToMany } from 'typeorm';
import { AdPlacementType } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AdRequest } from './ad-request.entity';

@Entity('ad_packages')
export class AdPackage extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'enum', enum: AdPlacementType })
  placementType: AdPlacementType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency: string;

  @Column({ type: 'int' })
  durationDays: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @OneToMany(() => AdRequest, (request) => request.adPackage)
  requests: AdRequest[];
}
