import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase13GeoIndicationTypesArray1746500001000 implements MigrationInterface {
  name = 'Phase13GeoIndicationTypesArray1746500001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "geoIndicationTypes" geo_indication_type[] NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `UPDATE "products" SET "geoIndicationTypes" = ARRAY["geoIndicationType"]::geo_indication_type[] WHERE "geoIndicationType" IS NOT NULL AND cardinality("geoIndicationTypes") = 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "geoIndicationTypes"`,
    );
  }
}
