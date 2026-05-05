import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase12MobileConfigExperienceManager1746410000000 implements MigrationInterface {
  name = 'Phase12MobileConfigExperienceManager1746410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS mobile_config_documents (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), draft jsonb NOT NULL DEFAULT '{}'::jsonb, published jsonb NULL, "updatedByAdminId" uuid NULL, "publishedByAdminId" uuid NULL, "publishedAt" timestamptz NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS mobile_config_documents');
  }
}
