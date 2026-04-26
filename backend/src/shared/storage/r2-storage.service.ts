import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageService } from './storage.interface';

/**
 * R2StorageService — Cloudflare R2 (S3-compatible) implementation
 *
 * Required env variables:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 *
 * Production setup:
 *   1. npm install @aws-sdk/client-s3
 *   2. Set STORAGE_DRIVER=r2 in .env
 *   3. Set all R2_* env variables
 */
@Injectable()
export class R2StorageService implements IStorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME', 'endemigo');
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL', '');

    if (!this.publicUrl) {
      this.logger.warn('R2_PUBLIC_URL not set — uploads will not be accessible via CDN');
    }
  }

  async upload(file: Express.Multer.File, subPath: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require('sharp');

    // Optimize with Sharp before upload
    const optimized = await sharp(file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const key = `${subPath}/${filename}`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

      const client = new S3Client({
        region: 'auto',
        endpoint: `https://${this.configService.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID', ''),
          secretAccessKey: this.configService.get<string>('R2_SECRET_ACCESS_KEY', ''),
        },
      });

      await client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: optimized,
          ContentType: 'image/webp',
        }),
      );

      this.logger.log(`Uploaded to R2: ${key}`);
      return `${this.publicUrl}/${key}`;
    } catch (error) {
      this.logger.error(`R2 upload failed: ${error}`);
      throw error;
    }
  }

  async delete(filePath: string): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
      const key = filePath.replace(`${this.publicUrl}/`, '');

      const client = new S3Client({
        region: 'auto',
        endpoint: `https://${this.configService.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID', ''),
          secretAccessKey: this.configService.get<string>('R2_SECRET_ACCESS_KEY', ''),
        },
      });

      await client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      this.logger.log(`Deleted from R2: ${key}`);
    } catch (error) {
      this.logger.error(`R2 delete failed: ${error}`);
    }
  }
}
