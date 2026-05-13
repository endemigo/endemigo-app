import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase16Brands1747000002000 implements MigrationInterface {
  name = 'Phase16Brands1747000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN ALTER TYPE admin_audit_action ADD VALUE IF NOT EXISTS 'BRAND_CREATED'; EXCEPTION WHEN undefined_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN ALTER TYPE admin_audit_action ADD VALUE IF NOT EXISTS 'BRAND_UPDATED'; EXCEPTION WHEN undefined_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN ALTER TYPE admin_audit_action ADD VALUE IF NOT EXISTS 'BRAND_DELETED'; EXCEPTION WHEN undefined_object THEN null; END $$;`);

    await queryRunner.query(`DO $$ BEGIN ALTER TYPE admin_audit_logs_action_enum ADD VALUE IF NOT EXISTS 'BRAND_CREATED'; EXCEPTION WHEN undefined_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN ALTER TYPE admin_audit_logs_action_enum ADD VALUE IF NOT EXISTS 'BRAND_UPDATED'; EXCEPTION WHEN undefined_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN ALTER TYPE admin_audit_logs_action_enum ADD VALUE IF NOT EXISTS 'BRAND_DELETED'; EXCEPTION WHEN undefined_object THEN null; END $$;`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS brands (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name varchar NOT NULL UNIQUE, slug varchar NOT NULL UNIQUE, "isActive" boolean NOT NULL DEFAULT true, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands ("isActive")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_brands_created_at ON brands ("createdAt" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_brands_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_brands_is_active`);
    await queryRunner.query(`DROP TABLE IF EXISTS brands`);
  }
}
