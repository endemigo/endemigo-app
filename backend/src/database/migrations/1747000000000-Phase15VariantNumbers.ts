import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase15VariantNumbers1747000000000 implements MigrationInterface {
  name = 'Phase15VariantNumbers1747000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE variant_number_status AS ENUM ('ACTIVE','PASSIVE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS variant_numbers (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "nameTr" varchar NOT NULL,
        "nameEn" varchar NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        status variant_number_status NOT NULL DEFAULT 'ACTIVE',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_variant_numbers_sort_order
      ON variant_numbers ("sortOrder")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_variant_numbers_sort_order`);
    await queryRunner.query(`DROP TABLE IF EXISTS variant_numbers`);
    await queryRunner.query(`DROP TYPE IF EXISTS variant_number_status`);
  }
}
