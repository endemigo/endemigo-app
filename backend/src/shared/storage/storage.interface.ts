/**
 * StorageService — Abstract file storage interface
 *
 * Local-first, production-ready:
 * - Dev: LocalStorageService (disk, /uploads/)
 * - Prod: R2StorageService (Cloudflare R2, Phase 10)
 *
 * Switch via STORAGE_DRIVER env variable.
 */
export interface IStorageService {
  upload(file: Express.Multer.File, path: string): Promise<string>;
  delete(path: string): Promise<void>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
