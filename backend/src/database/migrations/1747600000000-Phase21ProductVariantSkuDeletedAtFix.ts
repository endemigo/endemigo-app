import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase21ProductVariantSkuDeletedAtFix1747600000000 implements MigrationInterface {
  name = 'Phase21ProductVariantSkuDeletedAtFix1747600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_variant_skus"
      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_variant_skus"
      DROP COLUMN IF EXISTS "deletedAt"
    `);
  }
}
