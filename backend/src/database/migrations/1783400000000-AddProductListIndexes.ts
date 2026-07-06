import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductListIndexes1783400000000 implements MigrationInterface {
  name = 'AddProductListIndexes1783400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_status_created_at"
      ON "products" ("status", "createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_status_favorite_count"
      ON "products" ("status", "favoriteCount")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_category_status"
      ON "products" ("categoryId", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_seller"
      ON "products" ("sellerId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_products_seller"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_products_category_status"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_products_status_favorite_count"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_products_status_created_at"',
    );
  }
}
