import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6LedgerAccountPartialUniqueIndexes1745716400000 implements MigrationInterface {
  name = 'Phase6LedgerAccountPartialUniqueIndexes1745716400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ledger_accounts DROP CONSTRAINT IF EXISTS uq_ledger_accounts_owner_type_currency`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_accounts_user_owner_type_currency ON ledger_accounts ("ownerId", type, currency) WHERE "ownerId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_accounts_platform_type_currency ON ledger_accounts (type, currency) WHERE "ownerId" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_ledger_accounts_platform_type_currency`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_ledger_accounts_user_owner_type_currency`,
    );
    await queryRunner.query(
      `ALTER TABLE ledger_accounts ADD CONSTRAINT uq_ledger_accounts_owner_type_currency UNIQUE ("ownerId", type, currency)`,
    );
  }
}
