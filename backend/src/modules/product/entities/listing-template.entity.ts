import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('listing_templates')
export class ListingTemplate extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: [] })
  fields: any[];

  @Column({ type: 'jsonb', default: {} })
  variant: Record<string, any>;
}
