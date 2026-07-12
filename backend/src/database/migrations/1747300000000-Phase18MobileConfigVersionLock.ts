import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase18MobileConfigVersionLock1747300000000 implements MigrationInterface {
  name = 'Phase18MobileConfigVersionLock1747300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE mobile_config_documents ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE mobile_config_documents DROP COLUMN IF EXISTS version',
    );
  }
}
