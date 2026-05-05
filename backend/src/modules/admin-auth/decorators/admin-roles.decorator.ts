import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '@endemigo/shared';

export const ADMIN_ROLES_KEY = 'admin_roles';
export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
export const ALL_ADMIN_ROLES = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS,
  AdminRole.FINANCE,
  AdminRole.SUPPORT,
] as const;

export { AdminRole };
