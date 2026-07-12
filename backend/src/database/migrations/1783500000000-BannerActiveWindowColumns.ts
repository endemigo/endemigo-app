import { MigrationInterface, QueryRunner } from 'typeorm';

export class BannerActiveWindowColumns1783500000000 implements MigrationInterface {
  name = 'BannerActiveWindowColumns1783500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "banners"
      ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "banners"
      ADD COLUMN IF NOT EXISTS "startAt" TIMESTAMP
    `);
    await queryRunner.query(`
      ALTER TABLE "banners"
      ADD COLUMN IF NOT EXISTS "endAt" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "banners" DROP COLUMN IF EXISTS "endAt"');
    await queryRunner.query('ALTER TABLE "banners" DROP COLUMN IF EXISTS "startAt"');
    await queryRunner.query('ALTER TABLE "banners" DROP COLUMN IF EXISTS "isActive"');
  }
}
