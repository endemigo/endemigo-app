import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase23AddressesAndSellerDashboard1747800000000 implements MigrationInterface {
  name = 'Phase23AddressesAndSellerDashboard1747800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'addresses_type_enum') THEN
          CREATE TYPE "addresses_type_enum" AS ENUM ('BILLING', 'SHIPPING');
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `ALTER TYPE "addresses_type_enum" ADD VALUE IF NOT EXISTS 'SENDER'`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "addresses" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "type" "addresses_type_enum" NOT NULL,
        "title" varchar NOT NULL,
        "fullName" varchar NOT NULL,
        "phone" varchar NOT NULL,
        "city" varchar NOT NULL,
        "district" varchar NOT NULL,
        "neighborhood" varchar NULL,
        "addressLine" text NOT NULL,
        "postalCode" varchar NULL,
        "country" varchar NOT NULL DEFAULT 'TR',
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_addresses_user_type_default" ON "addresses" ("userId", "type", "isDefault")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_addresses_user_created" ON "addresses" ("userId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_addresses_user_created"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_addresses_user_type_default"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "addresses"`);
  }
}
