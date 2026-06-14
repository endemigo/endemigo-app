import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductViewsTable1780695000000 implements MigrationInterface {
  name = 'CreateProductViewsTable1780695000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_views" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "productId" uuid NOT NULL,
        "userId" uuid,
        "deviceToken" character varying,
        "viewCount" integer NOT NULL DEFAULT 1,
        "firstViewedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastViewedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "referrer" character varying,
        "platform" character varying,
        CONSTRAINT "PK_product_views_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_views_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_product_views_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_product_views_user" 
      ON "product_views" ("userId", "productId") 
      WHERE "userId" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_product_views_device" 
      ON "product_views" ("deviceToken", "productId") 
      WHERE "userId" IS NULL AND "deviceToken" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_product_views_device"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_product_views_user"');
    await queryRunner.query('DROP TABLE IF EXISTS "product_views"');
  }
}
