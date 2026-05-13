import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase14ProductExtendedMetadata1746580000000 implements MigrationInterface {
  name = 'Phase14ProductExtendedMetadata1746580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE product_production_season AS ENUM ('ALL_TIME','SPRING','SUMMER','AUTUMN','WINTER');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "barcodeNo" varchar NULL`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "productContent" text NULL`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "sellerNotes" text NULL`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "brand" varchar NULL`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "isEndemigoBrandCandidate" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "geoIndicationReceivedAt" date NULL`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "productionProvince" varchar NULL`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "productionDistrict" varchar NULL`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "productionSeason" product_production_season NOT NULL DEFAULT 'ALL_TIME'`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "salesMonths" integer[] NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "wholesalePrice" numeric(12,2) NULL`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "retailPrice" numeric(12,2) NULL`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "shippingProvince" varchar NULL`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "shippingDistrict" varchar NULL`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "shippingAddress" text NULL`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "additionalCertificates" text NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "additionalCertificates"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "shippingAddress"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "shippingDistrict"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "shippingProvince"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "retailPrice"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "wholesalePrice"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "salesMonths"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "productionSeason"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "productionDistrict"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "productionProvince"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "geoIndicationReceivedAt"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "isEndemigoBrandCandidate"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "brand"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "sellerNotes"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "productContent"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "barcodeNo"`);
    await queryRunner.query(`DROP TYPE IF EXISTS product_production_season`);
  }
}
