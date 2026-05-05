import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AdminRole, RC } from '@endemigo/shared';
import { AdminAuthService, AdminJwtPayload } from '../admin-auth.service';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';

interface RequestWithAdmin {
  headers: Record<string, string | string[] | undefined>;
  adminUser?: {
    id: string;
    email: string;
    roles: AdminRole[];
  };
  user?: {
    id: string;
    type: 'admin';
    roles: AdminRole[];
  };
}

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly adminAuthService: AdminAuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException({
        code: RC.UNAUTHORIZED,
        message: 'Admin token gerekli',
      });
    }

    const payload = await this.verifyAdminToken(token);
    const admin = await this.adminAuthService.findActiveById(payload.sub);
    if (!admin) {
      throw new UnauthorizedException({
        code: RC.ADMIN_FORBIDDEN,
        message: 'Admin kullanıcısı bulunamadı veya pasif',
      });
    }

    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles?.length) {
      const adminRoles = new Set(admin.roles);
      const allowed = requiredRoles.some((role) => adminRoles.has(role));
      if (!allowed) {
        throw new ForbiddenException({
          code: RC.ADMIN_FORBIDDEN,
          message: 'Bu admin işlemi için yetkiniz yok',
        });
      }
    }

    request.adminUser = {
      id: admin.id,
      email: admin.email,
      roles: admin.roles,
    };
    request.user = {
      id: admin.id,
      type: 'admin',
      roles: admin.roles,
    };
    return true;
  }

  private extractBearerToken(request: RequestWithAdmin): string | null {
    const header = request.headers.authorization;
    const value = Array.isArray(header) ? header[0] : header;
    if (!value?.startsWith('Bearer ')) {
      return null;
    }
    return value.slice('Bearer '.length).trim();
  }

  private async verifyAdminToken(token: string): Promise<AdminJwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<AdminJwtPayload>(token);
      if (payload.type !== 'admin' || !Array.isArray(payload.roles)) {
        throw new Error('Invalid admin payload');
      }
      return payload;
    } catch {
      throw new UnauthorizedException({
        code: RC.UNAUTHORIZED,
        message: 'Admin token geçersiz',
      });
    }
  }
}
