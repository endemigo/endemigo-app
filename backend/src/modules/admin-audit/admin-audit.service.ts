import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AdminAuditAction, AdminRole, RC } from '@endemigo/shared';
import { AdminAuditLog } from './entities/admin-audit-log.entity';

export interface AdminAuditInput {
  actorAdminId: string;
  actorRoles: AdminRole[];
  action: AdminAuditAction;
  targetType: string;
  targetId: string;
  reason?: string | null;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AdminAuditQuery {
  actorAdminId?: string;
  action?: AdminAuditAction;
  targetType?: string;
  targetId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminAuditService {
  private readonly reasonOptionalActions = new Set<AdminAuditAction>([
    AdminAuditAction.ADMIN_LOGIN,
  ]);

  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
  ) {}

  async recordAction(input: AdminAuditInput): Promise<AdminAuditLog> {
    if (
      !this.reasonOptionalActions.has(input.action) &&
      !input.reason?.trim()
    ) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Admin işlemi için sebep zorunludur',
      });
    }

    const auditLog = this.auditRepo.create({
      actorAdminId: input.actorAdminId,
      actorRoles: input.actorRoles,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason?.trim() || null,
      before: input.before ?? {},
      after: input.after ?? {},
      metadata: input.metadata ?? {},
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    return this.auditRepo.save(auditLog);
  }

  async list(query: AdminAuditQuery) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);
    const where: FindOptionsWhere<AdminAuditLog> = {};

    if (query.actorAdminId) where.actorAdminId = query.actorAdminId;
    if (query.action) where.action = query.action;
    if (query.targetType) where.targetType = query.targetType;
    if (query.targetId) where.targetId = query.targetId;

    const [items, total] = await this.auditRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      code: RC.ADMIN_AUDIT_FETCHED,
      message: 'Admin audit kayıtları getirildi',
      items,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }
}
