import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase15VariantKinds1747000001000 implements MigrationInterface {
  name = 'Phase15VariantKinds1747000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE variant_option_kind AS ENUM ('COLOR','SIZE','NUMBER','OPTION','VARIATION');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE variant_numbers
      ADD COLUMN IF NOT EXISTS kind variant_option_kind NOT NULL DEFAULT 'NUMBER'
    `);
    await queryRunner.query(`
      ALTER TABLE variant_numbers
      ADD COLUMN IF NOT EXISTS "swatchHex" varchar NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_variant_numbers_kind
      ON variant_numbers (kind)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_variant_numbers_kind`);
    await queryRunner.query(`ALTER TABLE variant_numbers DROP COLUMN IF EXISTS "swatchHex"`);
    await queryRunner.query(`ALTER TABLE variant_numbers DROP COLUMN IF EXISTS kind`);
    await queryRunner.query(`DROP TYPE IF EXISTS variant_option_kind`);
  }
}
