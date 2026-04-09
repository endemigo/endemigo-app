import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { IStorageService } from './storage.interface';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  async upload(file: Express.Multer.File, subPath: string): Promise<string> {
    const dir = path.join(this.uploadDir, subPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate unique filename with webp extension
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const filePath = path.join(dir, filename);

    // Optimize with Sharp: resize max 800px, webp, quality 80
    await sharp(file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filePath);

    this.logger.log(`Uploaded: ${subPath}/${filename}`);
    return `/uploads/${subPath}/${filename}`;
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.log(`Deleted: ${filePath}`);
    }
  }
}
