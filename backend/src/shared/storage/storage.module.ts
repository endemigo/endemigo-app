import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_SERVICE } from './storage.interface';
import { LocalStorageService } from './local-storage.service';
import { R2StorageService } from './r2-storage.service';

/**
 * StorageModule — Provides storage service globally
 * Switch implementation via STORAGE_DRIVER env:
 *   - 'local' (default): LocalStorageService — disk-based uploads
 *   - 'r2': R2StorageService — Cloudflare R2 (S3-compatible)
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_SERVICE,
      useFactory: (configService: ConfigService) => {
        const driver = configService.get<string>('STORAGE_DRIVER', 'local');
        if (driver === 'r2') {
          return new R2StorageService(configService);
        }
        return new LocalStorageService();
      },
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
