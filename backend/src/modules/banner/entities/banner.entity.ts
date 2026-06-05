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
}
