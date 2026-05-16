import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase24AddressesSenderEnumCompatibility1747900000000 implements MigrationInterface {
  name = 'Phase24AddressesSenderEnumCompatibility1747900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'addresses_type_enum') THEN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'addresses_type_enum'
              AND e.enumlabel = 'SENDER'
          ) THEN
            ALTER TYPE "addresses_type_enum" ADD VALUE 'SENDER';
          END IF;
        END IF;
      END
      $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum value rollback is intentionally skipped.
  }
}

