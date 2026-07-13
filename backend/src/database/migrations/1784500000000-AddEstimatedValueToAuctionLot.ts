import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEstimatedValueToAuctionLot1784500000000 implements MigrationInterface {
  name = 'AddEstimatedValueToAuctionLot1784500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE auctions
         ADD COLUMN IF NOT EXISTS "estimatedValueMin" numeric(12,2),
         ADD COLUMN IF NOT EXISTS "estimatedValueMax" numeric(12,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE auctions
         DROP COLUMN IF EXISTS "estimatedValueMin",
         DROP COLUMN IF EXISTS "estimatedValueMax"`,
    );
  }
}
