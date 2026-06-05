import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeatureBadgesTable1749700000000 implements MigrationInterface {
  name = 'CreateFeatureBadgesTable1749700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "feature_badges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE NULL,
        "name" character varying NOT NULL,
        "nameEn" character varying NOT NULL,
        "code" character varying NULL,
        "logoUrl" character varying NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_feature_badges_code" UNIQUE ("code"),
        CONSTRAINT "PK_feature_badges" PRIMARY KEY ("id")
      )
    `);

    // Seed the standard feature options for backward compatibility
    await queryRunner.query(`
      INSERT INTO "feature_badges" ("id", "name", "nameEn", "code", "logoUrl", "isActive") VALUES
      ('f0000000-0000-0000-0000-000000000001', 'Vegan', 'Vegan', 'VEGAN', 'https://endemigo.com/source/images/vegan.png', true),
      ('f0000000-0000-0000-0000-000000000002', 'Bio', 'Bio', 'BIO', 'https://endemigo.com/source/images/bio.png', true),
      ('f0000000-0000-0000-0000-000000000003', 'Natural', 'Natural', 'NATURAL', 'https://endemigo.com/source/images/natural.png', true),
      ('f0000000-0000-0000-0000-000000000004', 'Eco', 'Eco', 'ECO', 'https://endemigo.com/source/images/eco.png', true),
      ('f0000000-0000-0000-0000-000000000005', 'Paraben', 'Paraben Free', 'PARABEN_FREE', 'https://endemigo.com/source/images/paraben.png', true),
      ('f0000000-0000-0000-0000-000000000006', 'Organik', 'Organic', 'ORGANIC', 'https://endemigo.com/source/images/organik2.png', true),
      ('f0000000-0000-0000-0000-000000000007', 'Helal', 'Halal', 'HALAL', 'https://endemigo.com/source/images/helal.png', true),
      ('f0000000-0000-0000-0000-000000000008', 'Katkısız', 'Additive Free', 'ADDITIVE_FREE', 'https://endemigo.com/source/images/katkisiz.png', true),
      ('f0000000-0000-0000-0000-000000000009', 'Şekersiz', 'Sugar Free', 'SUGAR_FREE', 'https://endemigo.com/source/images/sekersiz.png', true),
      ('f0000000-0000-0000-0000-000000000010', 'Glutensiz', 'Gluten Free', 'GLUTEN_FREE', 'https://endemigo.com/source/images/glutensiz.png', true),
      ('f0000000-0000-0000-0000-000000000011', 'HandMade', 'HandMade', 'HANDMADE', 'https://endemigo.com/source/images/hom.png', true),
      ('f0000000-0000-0000-0000-000000000012', 'Slow Food', 'Slow Food', 'SLOW_FOOD', 'https://endemigo.com/source/images/slo.png', true),
      ('f0000000-0000-0000-0000-000000000013', 'Cold Delivery', 'Cold Delivery', 'COLD_DELIVERY', 'https://endemigo.com/source/images/souk.png', true)
      ON CONFLICT ("code") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "feature_badges"`);
  }
}
