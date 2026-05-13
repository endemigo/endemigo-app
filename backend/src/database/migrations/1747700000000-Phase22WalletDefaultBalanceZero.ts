import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase22WalletDefaultBalanceZero1747700000000 implements MigrationInterface {
  name = 'Phase22WalletDefaultBalanceZero1747700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallets"
      ALTER COLUMN "balance" SET DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallets"
      ALTER COLUMN "balance" SET DEFAULT 10000
    `);
  }
}
