import { MigrationInterface, QueryRunner } from 'typeorm';

export class ListingDraftsAndCategoryTemplates1770000000000 implements MigrationInterface {
  name = 'ListingDraftsAndCategoryTemplates1770000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE listing_draft_entry_mode AS ENUM ('MARKETPLACE', 'AUCTION');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE listing_draft_status AS ENUM ('DRAFT', 'PUBLISHED', 'DELETED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE listing_type AS ENUM ('DIRECT_SALE', 'AUCTION');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_listing_drafts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sellerId" uuid NOT NULL,
        "categoryId" uuid NULL,
        "entryMode" listing_draft_entry_mode NOT NULL,
        "listingType" listing_type NOT NULL,
        status listing_draft_status NOT NULL DEFAULT 'DRAFT',
        "currentStep" integer NOT NULL DEFAULT 1,
        payload jsonb NOT NULL DEFAULT '{}',
        "productId" uuid NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_listing_drafts_seller_status
      ON product_listing_drafts ("sellerId", status)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_product_listing_drafts_seller_status');
    await queryRunner.query('DROP TABLE IF EXISTS product_listing_drafts');
    await queryRunner.query('DROP TYPE IF EXISTS listing_draft_status');
    await queryRunner.query('DROP TYPE IF EXISTS listing_draft_entry_mode');
    await queryRunner.query('DROP TYPE IF EXISTS listing_type');
    await queryRunner.query('ALTER TABLE categories DROP COLUMN IF EXISTS metadata');
  }
}
