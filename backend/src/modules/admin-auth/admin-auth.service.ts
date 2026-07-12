import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminRole, RC } from '@endemigo/shared';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminUser } from './entities/admin-user.entity';

export interface AdminJwtPayload {
  sub: string;
  type: 'admin';
  roles: AdminRole[];
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(AdminUser)
    private readonly adminUserRepo: Repository<AdminUser>,
  ) {}

  async login(dto: AdminLoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const admin = await this.adminUserRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException({
        code: RC.INVALID_CREDENTIALS,
        message: 'Geçersiz admin e-posta veya şifre',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      admin.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: RC.INVALID_CREDENTIALS,
        message: 'Geçersiz admin e-posta veya şifre',
      });
    }

    admin.lastLoginAt = new Date();
    await this.adminUserRepo.save(admin);

    const accessToken = await this.jwtService.signAsync({
      sub: admin.id,
      type: 'admin',
      roles: admin.roles,
    } satisfies AdminJwtPayload);

    return {
      code: RC.ADMIN_LOGIN_SUCCESS,
      message: 'Admin girişi başarılı',
      admin: this.toResponse(admin),
      accessToken,
    };
  }

  async findActiveById(id: string): Promise<AdminUser | null> {
    const admin = await this.adminUserRepo.findOne({ where: { id } });
    return admin?.isActive ? admin : null;
  }

  async getMe(adminId: string) {
    const admin = await this.findActiveById(adminId);
    if (!admin) {
      throw new UnauthorizedException({
        code: RC.ADMIN_FORBIDDEN,
        message: 'Admin oturumu geçersiz',
      });
    }

    return {
      code: RC.PROFILE_FETCHED,
      message: 'Admin profili getirildi',
      admin: this.toResponse(admin),
    };
  }

  private toResponse(admin: AdminUser) {
    return {
      id: admin.id,
      email: admin.email,
      displayName: admin.displayName,
      roles: admin.roles,
      lastLoginAt: admin.lastLoginAt,
    };
  }
}
