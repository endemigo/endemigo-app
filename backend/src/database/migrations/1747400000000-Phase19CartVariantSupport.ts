import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase19CartVariantSupport1747400000000 implements MigrationInterface {
  name = 'Phase19CartVariantSupport1747400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD COLUMN IF NOT EXISTS "variantNumberId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_items"
      DROP CONSTRAINT IF EXISTS "UQ_cart_items_user_product"
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD CONSTRAINT "FK_cart_items_variant_number"
      FOREIGN KEY ("variantNumberId")
      REFERENCES "variant_numbers"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_cart_items_user_product_variant"
      ON "cart_items" ("userId", "productId", "variantNumberId")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_cart_items_user_product_no_variant"
      ON "cart_items" ("userId", "productId")
      WHERE "variantNumberId" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_cart_items_user_product_no_variant"');
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_cart_items_user_product_variant"');
    await queryRunner.query('ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "FK_cart_items_variant_number"');
    await queryRunner.query('ALTER TABLE "cart_items" DROP COLUMN IF EXISTS "variantNumberId"');
    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD CONSTRAINT "UQ_cart_items_user_product"
      UNIQUE ("userId", "productId")
    `);
  }
}
