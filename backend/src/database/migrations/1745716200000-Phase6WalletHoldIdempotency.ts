import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6WalletHoldIdempotency1745716200000 implements MigrationInterface {
  name = 'Phase6WalletHoldIdempotency1745716200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE wallet_holds ADD COLUMN IF NOT EXISTS "idempotencyKey" varchar NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wallet_holds_idempotencyKey" ON wallet_holds ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_holds_idempotencyKey"`);
    await queryRunner.query(`ALTER TABLE wallet_holds DROP COLUMN IF EXISTS "idempotencyKey"`);
  }
}
