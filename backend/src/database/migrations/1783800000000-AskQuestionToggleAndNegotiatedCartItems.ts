import { MigrationInterface, QueryRunner } from 'typeorm';

export class AskQuestionToggleAndNegotiatedCartItems1783800000000 implements MigrationInterface {
  name = 'AskQuestionToggleAndNegotiatedCartItems1783800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS "askQuestionEnabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS "offerId" uuid NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cart_items_offer" ON cart_items ("offerId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cart_items_offer"`);
    await queryRunner.query(
      `ALTER TABLE cart_items DROP COLUMN IF EXISTS "offerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE products DROP COLUMN IF EXISTS "askQuestionEnabled"`,
    );
  }
}
