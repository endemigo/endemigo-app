import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBannersTable1780090000000 implements MigrationInterface {
  name = 'CreateBannersTable1780090000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "banners" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "slideDuration" integer NOT NULL DEFAULT 3000,
        "aspectRatio" character varying NOT NULL DEFAULT '16:9',
        "items" jsonb NOT NULL DEFAULT '[]'::jsonb,
        CONSTRAINT "PK_banners_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_banners_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_banners_slug" ON "banners" ("slug")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_banners_slug"');
    await queryRunner.query('DROP TABLE IF EXISTS "banners"');
  }
}
