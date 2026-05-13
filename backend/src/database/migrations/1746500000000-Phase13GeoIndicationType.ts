import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase13GeoIndicationType1746500000000 implements MigrationInterface {
  name = 'Phase13GeoIndicationType1746500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE geo_indication_type AS ENUM ('PDO','PGI','TSG'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "geoIndicationType" geo_indication_type NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "geoIndicationType"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS geo_indication_type`);
  }
}
