import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGeoIndicationsTable1749600000000 implements MigrationInterface {
  name = 'CreateGeoIndicationsTable1749600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "geo_indications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE NULL,
        "name" character varying NOT NULL,
        "nameEn" character varying NOT NULL,
        "type" character varying NOT NULL DEFAULT 'PDO',
        "code" character varying NULL,
        "description" text NULL,
        "descriptionEn" text NULL,
        "logoUrl" character varying NULL,
        "issuer" character varying NULL,
        "registrationUrl" character varying NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_geo_indications_code" UNIQUE ("code"),
        CONSTRAINT "PK_geo_indications" PRIMARY KEY ("id")
      )
    `);

    // Seed the standard hardcoded badge types for backward compatibility
    await queryRunner.query(`
      INSERT INTO "geo_indications" ("id", "name", "nameEn", "type", "code", "description", "descriptionEn", "logoUrl", "issuer", "isActive") VALUES
      ('a0000000-0000-0000-0000-000000000001', 'Kırmızı (TR)', 'Red (EN)', 'PDO', 'PDO_RED_TR', 'Menşe Adı Tescil İşareti', 'Protected Designation of Origin badge', 'https://endemigo.com/source/images/isaretkirmizi.webp', 'TÜRKPATENT', true),
      ('a0000000-0000-0000-0000-000000000002', 'Yeşil (TR)', 'Green (EN)', 'PGI', 'PGI_GREEN_TR', 'Mahreç İşareti Tescil İşareti', 'Protected Geographical Indication badge', 'https://endemigo.com/source/images/isaretyesil.webp', 'TÜRKPATENT', true),
      ('a0000000-0000-0000-0000-000000000003', 'Mavi (TR)', 'Blue (EN)', 'TSG', 'TSG_BLUE_TR', 'Geleneksel Ürün Adı Tescil İşareti', 'Traditional Speciality Guaranteed badge', 'https://endemigo.com/source/images/isaretmavi.webp', 'TÜRKPATENT', true),
      ('a0000000-0000-0000-0000-000000000004', 'Kırmızı (EN)', 'Red (EN) (Alt)', 'PDO', 'PDO_RED_EN', 'Menşe Adı Tescil İşareti (EN)', 'Protected Designation of Origin badge (EN)', 'https://endemigo.com/source/images/isaretkirmizien.webp', 'TÜRKPATENT', true),
      ('a0000000-0000-0000-0000-000000000005', 'Yeşil (EN)', 'Green (EN) (Alt)', 'PGI', 'PGI_GREEN_EN', 'Mahreç İşareti Tescil İşareti (EN)', 'Protected Geographical Indication badge (EN)', 'https://endemigo.com/source/images/isaretyesilen.webp', 'TÜRKPATENT', true),
      ('a0000000-0000-0000-0000-000000000006', 'Mavi (EN)', 'Blue (EN) (Alt)', 'TSG', 'TSG_BLUE_EN', 'Geleneksel Ürün Adı Tescil İşareti (EN)', 'Traditional Speciality Guaranteed badge (EN)', 'https://endemigo.com/source/images/isaretmavien.webp', 'TÜRKPATENT', true)
      ON CONFLICT ("code") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "geo_indications"`);
  }
}
