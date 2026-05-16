import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { ContentStudioController } from './content-studio.controller';
import { ContentStudioService } from './content-studio.service';
import { ContentStudioDocumentEntity } from './entities/content-studio-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContentStudioDocumentEntity]),
    AdminAuditModule,
    AdminAuthModule,
  ],
  controllers: [ContentStudioController],
  providers: [ContentStudioService],
  exports: [ContentStudioService],
})
export class ContentStudioModule {}
