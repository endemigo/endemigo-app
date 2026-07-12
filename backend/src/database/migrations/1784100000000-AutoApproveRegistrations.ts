import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoApproveRegistrations1784100000000 implements MigrationInterface {
  name = 'AutoApproveRegistrations1784100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE auction_events
         ADD COLUMN IF NOT EXISTS "autoApproveRegistrations" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE auction_events DROP COLUMN IF EXISTS "autoApproveRegistrations"`,
    );
  }
}
