import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('geo_indications')
export class GeoIndication extends BaseEntity {
  @Column()
  name: string;

  @Column()
  nameEn: string;

  @Column({ type: 'varchar', default: 'PDO' })
  type: string; // 'PDO' | 'PGI' | 'TSG' | 'CERTIFICATE'

  @Column({ type: 'varchar', nullable: true, unique: true })
  code: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  descriptionEn: string | null;

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  issuer: string | null;

  @Column({ type: 'varchar', nullable: true })
  registrationUrl: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
