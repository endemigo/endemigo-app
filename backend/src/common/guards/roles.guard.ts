import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, type AppRole } from '../decorators/roles.decorator';

interface AuthenticatedUser {
  isSeller?: boolean;
  isAdmin?: boolean;
  roles?: AppRole[];
}

interface RequestWithUser {
  user?: AuthenticatedUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Yetkilendirme gerekli');
    }

    // NOT: Admin ayrı tablo/auth sistemi olacak (Phase 11)
    // Bu guard mevcut user/seller modelini korur; admin sadece imzalı JWT payload'ı
    // ileride admin sistemi tarafından açıkça taşıdığında geçerli olur.
    const userRoles = new Set<AppRole>(['user']);
    if (user.isSeller) userRoles.add('seller');
    if (user.isAdmin) userRoles.add('admin');
    user.roles?.forEach((role) => userRoles.add(role));

    const hasRole = requiredRoles.some((role) => userRoles.has(role));
    if (!hasRole) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok');
    }

    return true;
  }
}
