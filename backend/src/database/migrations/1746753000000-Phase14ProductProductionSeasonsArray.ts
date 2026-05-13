import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase14ProductProductionSeasonsArray1746753000000 implements MigrationInterface {
  name = 'Phase14ProductProductionSeasonsArray1746753000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS "productionSeasons" product_production_season[] NOT NULL DEFAULT '{}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "productionSeasons"`);
  }
}
