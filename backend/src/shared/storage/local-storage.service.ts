import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { IStorageService } from './storage.interface';
import { RC } from '../constants/response-codes';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  async upload(file: Express.Multer.File, subPath: string): Promise<string> {
    // WR-01: Defense-in-depth — reject path traversal in subPath
    if (subPath.includes('..') || subPath.includes('\0')) {
      throw new Error('Invalid storage path');
    }

    const dir = path.join(this.uploadDir, subPath);
    // Verify resolved path is still within uploadDir
    if (!path.resolve(dir).startsWith(path.resolve(this.uploadDir))) {
      throw new Error('Path traversal detected');
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // WR-02: Verify image buffer before processing — MIME type alone is client-spoofable
    const metadata = await this.readImageMetadata(file.buffer);
    if (!metadata.format || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) {
      throw new BadRequestException({ code: RC.VALIDATION_ERROR, message: 'Geçersiz görsel formatı' });
    }

    // Generate unique filename with webp extension
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const filePath = path.join(dir, filename);

    // Optimize with Sharp: resize max 800px, webp, quality 80
    try {
      await sharp(file.buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(filePath);
    } catch {
      throw new BadRequestException({ code: RC.VALIDATION_ERROR, message: 'Geçersiz görsel dosyası' });
    }

    this.logger.log(`Uploaded: ${subPath}/${filename}`);
    return `/uploads/${subPath}/${filename}`;
  }

  async delete(filePath: string): Promise<void> {
    const uploadRoot = path.resolve(this.uploadDir);
    const storagePath = filePath.startsWith('/') ? `.${filePath}` : filePath;
    const fullPath = path.resolve(process.cwd(), storagePath);
    const relativePath = path.relative(uploadRoot, fullPath);

    if (relativePath === '' || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error('Invalid storage delete path');
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.log(`Deleted: ${filePath}`);
    }
  }

  private async readImageMetadata(buffer: Buffer): Promise<{ format?: string }> {
    try {
      return await sharp(buffer).metadata();
    } catch {
      throw new BadRequestException({ code: RC.VALIDATION_ERROR, message: 'Geçersiz görsel dosyası' });
    }
  }
}
