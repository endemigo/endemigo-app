import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase12CartFoundation1746400000000 implements MigrationInterface {
  name = 'Phase12CartFoundation1746400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cart_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "userId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_cart_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cart_items_user_product" UNIQUE ("userId", "productId"),
        CONSTRAINT "CHK_cart_items_quantity_positive" CHECK ("quantity" > 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cart_items_user_created"
      ON "cart_items" ("userId", "createdAt")
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD CONSTRAINT "FK_cart_items_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD CONSTRAINT "FK_cart_items_product"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "FK_cart_items_product"');
    await queryRunner.query('ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "FK_cart_items_user"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_cart_items_user_created"');
    await queryRunner.query('DROP TABLE IF EXISTS "cart_items"');
  }
}
