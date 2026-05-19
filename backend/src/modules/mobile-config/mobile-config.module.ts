import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminSettingsModule } from '../admin-settings/admin-settings.module';
import { MobileConfigController } from './mobile-config.controller';
import { MobileConfigService } from './mobile-config.service';
import { MobileConfigDocument } from './entities/mobile-config-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MobileConfigDocument]),
    AdminAuditModule,
    AdminAuthModule,
    AdminSettingsModule,
  ],
  controllers: [MobileConfigController],
  providers: [MobileConfigService],
  exports: [MobileConfigService],
})
export class MobileConfigModule {}
