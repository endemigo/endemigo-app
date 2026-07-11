import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUntimedAuctionMode1784000000000 implements MigrationInterface {
  name = 'AddUntimedAuctionMode1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE auction_events
         ADD COLUMN IF NOT EXISTS "isUntimed" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE auctions
         ADD COLUMN IF NOT EXISTS "isUntimed" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE auction_events DROP COLUMN IF EXISTS "isUntimed"`,
    );
    await queryRunner.query(
      `ALTER TABLE auctions DROP COLUMN IF EXISTS "isUntimed"`,
    );
  }
}
