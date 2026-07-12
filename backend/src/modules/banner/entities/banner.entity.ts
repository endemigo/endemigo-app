import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import type { BannerItem } from '@endemigo/shared';

@Entity('banners')
export class BannerEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'int', default: 3000 })
  slideDuration: number;

  @Column({ type: 'varchar', default: '16:9' })
  aspectRatio: '16:9' | '4:3' | '1:1' | '3:1';

  @Column({ type: 'jsonb', default: [] })
  items: BannerItem[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endAt: Date | null;
}
