import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AdminRole } from '@endemigo/shared';
import { AdminUser } from './entities/admin-user.entity';

@Injectable()
export class DevAdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(DevAdminSeedService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AdminUser)
    private readonly adminUserRepo: Repository<AdminUser>,
  ) {}

  async onModuleInit() {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv && nodeEnv !== 'development') {
      return;
    }

    const email =
      this.configService.get<string>('DEV_ADMIN_EMAIL')?.trim().toLowerCase() ||
      'admin@endemigo.test';
    const password =
      this.configService.get<string>('DEV_ADMIN_PASSWORD') || 'Secret123!';
    const displayName =
      this.configService.get<string>('DEV_ADMIN_DISPLAY_NAME') ||
      'Development Admin';

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await this.adminUserRepo.findOne({ where: { email } });

    if (!admin) {
      await this.adminUserRepo.save(
        this.adminUserRepo.create({
          email,
          passwordHash,
          displayName,
          roles: [AdminRole.SUPER_ADMIN],
          isActive: true,
          lastLoginAt: null,
        }),
      );
      this.logger.log(`Development admin created for ${email}`);
      return;
    }

    admin.passwordHash = passwordHash;
    admin.displayName = displayName;
    admin.roles = [AdminRole.SUPER_ADMIN];
    admin.isActive = true;
    await this.adminUserRepo.save(admin);
    this.logger.log(`Development admin refreshed for ${email}`);
  }
}
