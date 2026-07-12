import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6ProductAskPriceColumns1745716100000 implements MigrationInterface {
  name = 'Phase6ProductAskPriceColumns1745716100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS "askPriceEnabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS "askPriceMinAmount" numeric(12,2) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE products DROP COLUMN IF EXISTS "askPriceMinAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE products DROP COLUMN IF EXISTS "askPriceEnabled"`,
    );
  }
}
