import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase1JournalEntryTypeEnum1745716300000 implements MigrationInterface {
  name = 'Phase1JournalEntryTypeEnum1745716300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE journal_entry_type AS ENUM (
          'wallet_hold',
          'wallet_release',
          'wallet_capture',
          'payment_escrow',
          'payment_refund',
          'order_escrow_release',
          'payout_reserve',
          'payout_release'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE journal_entries
      ALTER COLUMN type TYPE journal_entry_type
      USING type::journal_entry_type
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE journal_entries
      ALTER COLUMN type TYPE varchar
      USING type::varchar
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS journal_entry_type`);
  }
}
