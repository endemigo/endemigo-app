import { Column, Entity } from 'typeorm';
import type { MobileExperienceConfig } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('mobile_config_documents')
export class MobileConfigDocument extends BaseEntity {
  @Column({ type: 'jsonb', default: {} })
  draft: MobileExperienceConfig;

  @Column({ type: 'jsonb', nullable: true })
  published: MobileExperienceConfig | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'uuid', nullable: true })
  updatedByAdminId: string | null;

  @Column({ type: 'uuid', nullable: true })
  publishedByAdminId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;
}
