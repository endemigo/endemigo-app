import { Column, Entity } from 'typeorm';
import { AdminAuditAction, AdminRole } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('admin_audit_logs')
export class AdminAuditLog extends BaseEntity {
  @Column('uuid')
  actorAdminId: string;

  @Column({
    type: 'enum',
    enum: AdminRole,
    array: true,
    default: [],
  })
  actorRoles: AdminRole[];

  @Column({ type: 'enum', enum: AdminAuditAction })
  action: AdminAuditAction;

  @Column()
  targetType: string;

  @Column()
  targetId: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'jsonb', default: {} })
  before: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  after: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;
}
