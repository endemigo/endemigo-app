import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  slug: string;

  @Column({ default: 0 })
  sortOrder: number;
}
