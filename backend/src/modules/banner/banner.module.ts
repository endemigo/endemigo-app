import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { BannerController } from './banner.controller';
import { BannerService } from './banner.service';
import { BannerEntity } from './entities/banner.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BannerEntity]),
    AdminAuditModule,
    AdminAuthModule,
  ],
  controllers: [BannerController],
  providers: [BannerService],
  exports: [BannerService],
})
export class BannerModule {}
