import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('feature_badges')
export class FeatureBadge extends BaseEntity {
  @Column()
  name: string;

  @Column()
  nameEn: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  code: string | null;

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
