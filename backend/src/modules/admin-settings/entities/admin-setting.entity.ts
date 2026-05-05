import { Column, Entity } from 'typeorm';
import { AdminSettingKey } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('admin_settings')
export class AdminSetting extends BaseEntity {
  @Column({
    type: 'enum',
    enum: AdminSettingKey,
    unique: true,
  })
  key: AdminSettingKey;

  @Column({ type: 'jsonb', default: {} })
  value: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: false })
  isSensitive: boolean;
}
