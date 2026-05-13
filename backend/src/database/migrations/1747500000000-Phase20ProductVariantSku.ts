import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase20ProductVariantSku1747500000000 implements MigrationInterface {
  name = 'Phase20ProductVariantSku1747500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_variant_skus" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ NULL,
        "productId" uuid NOT NULL,
        "colorVariantNumberId" uuid NULL,
        "sizeVariantNumberId" uuid NULL,
        "skuCode" varchar(80) NULL,
        "stockQuantity" int NOT NULL DEFAULT 0,
        "priceOverride" decimal(12,2) NULL,
        "imageUrl" varchar NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" int NOT NULL DEFAULT 0,
        CONSTRAINT "PK_product_variant_skus_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_product_variant_skus_product_color_size" UNIQUE ("productId", "colorVariantNumberId", "sizeVariantNumberId")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "product_variant_skus"
      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_variant_skus_product_sort"
      ON "product_variant_skus" ("productId", "sortOrder")
    `);

    await queryRunner.query(`
      ALTER TABLE "product_variant_skus"
      ADD CONSTRAINT "FK_product_variant_skus_product"
      FOREIGN KEY ("productId")
      REFERENCES "products"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "product_variant_skus"
      ADD CONSTRAINT "FK_product_variant_skus_color_variant"
      FOREIGN KEY ("colorVariantNumberId")
      REFERENCES "variant_numbers"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "product_variant_skus"
      ADD CONSTRAINT "FK_product_variant_skus_size_variant"
      FOREIGN KEY ("sizeVariantNumberId")
      REFERENCES "variant_numbers"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD COLUMN IF NOT EXISTS "productVariantSkuId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD CONSTRAINT "FK_cart_items_product_variant_sku"
      FOREIGN KEY ("productVariantSkuId")
      REFERENCES "product_variant_skus"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_cart_items_user_product_sku"
      ON "cart_items" ("userId", "productId", "productVariantSkuId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_cart_items_user_product_sku"');
    await queryRunner.query('ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "FK_cart_items_product_variant_sku"');
    await queryRunner.query('ALTER TABLE "cart_items" DROP COLUMN IF EXISTS "productVariantSkuId"');

    await queryRunner.query('ALTER TABLE "product_variant_skus" DROP CONSTRAINT IF EXISTS "FK_product_variant_skus_size_variant"');
    await queryRunner.query('ALTER TABLE "product_variant_skus" DROP CONSTRAINT IF EXISTS "FK_product_variant_skus_color_variant"');
    await queryRunner.query('ALTER TABLE "product_variant_skus" DROP CONSTRAINT IF EXISTS "FK_product_variant_skus_product"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_product_variant_skus_product_sort"');
    await queryRunner.query('DROP TABLE IF EXISTS "product_variant_skus"');
  }
}
