import { Column, Entity } from 'typeorm';
import { AdminRole } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('admin_users')
export class AdminUser extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  displayName: string;

  @Column({
    type: 'enum',
    enum: AdminRole,
    array: true,
    default: [AdminRole.SUPPORT],
  })
  roles: AdminRole[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;
}
