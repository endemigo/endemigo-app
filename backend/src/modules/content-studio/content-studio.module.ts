import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminSetting } from '../admin-settings/entities/admin-setting.entity';
import { ContentStudioController } from './content-studio.controller';
import { ContentStudioService } from './content-studio.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminSetting]), AdminAuditModule, AdminAuthModule],
  controllers: [ContentStudioController],
  providers: [ContentStudioService],
  exports: [ContentStudioService],
})
export class ContentStudioModule {}
