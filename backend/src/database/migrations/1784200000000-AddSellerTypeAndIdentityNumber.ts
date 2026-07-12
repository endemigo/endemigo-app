import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSellerTypeAndIdentityNumber1784200000000 implements MigrationInterface {
  name = 'AddSellerTypeAndIdentityNumber1784200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "seller_profiles_sellertype_enum" AS ENUM ('INDIVIDUAL', 'CORPORATE');
       EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    // Mevcut satırlar işletme bilgisiyle başvurdu — CORPORATE varsayılır
    await queryRunner.query(
      `ALTER TABLE seller_profiles
         ADD COLUMN IF NOT EXISTS "sellerType" "seller_profiles_sellertype_enum" NOT NULL DEFAULT 'CORPORATE'`,
    );
    await queryRunner.query(
      `ALTER TABLE seller_profiles
         ADD COLUMN IF NOT EXISTS "identityNumber" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE seller_profiles DROP COLUMN IF EXISTS "identityNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE seller_profiles DROP COLUMN IF EXISTS "sellerType"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "seller_profiles_sellertype_enum"`,
    );
  }
}
