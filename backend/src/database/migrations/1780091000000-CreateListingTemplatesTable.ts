import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateListingTemplatesTable1780091000000 implements MigrationInterface {
  name = 'CreateListingTemplatesTable1780091000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "listing_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "name" character varying NOT NULL,
        "description" text,
        "fields" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "variant" jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT "PK_listing_templates_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_listing_templates_name" UNIQUE ("name")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "listing_templates"');
  }
}
