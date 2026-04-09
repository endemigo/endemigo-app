import { Module, Global } from '@nestjs/common';
import { STORAGE_SERVICE } from './storage.interface';
import { LocalStorageService } from './local-storage.service';

/**
 * StorageModule — Provides storage service globally
 * Switch implementation via STORAGE_DRIVER env (future: R2StorageService)
 */
@Global()
@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      useClass: LocalStorageService,
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
