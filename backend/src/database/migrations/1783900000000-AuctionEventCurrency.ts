import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuctionEventCurrency1783900000000 implements MigrationInterface {
  name = 'AuctionEventCurrency1783900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE auction_events
         ADD COLUMN IF NOT EXISTS "currency" varchar(3) NOT NULL DEFAULT 'TRY'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE auction_events DROP COLUMN IF EXISTS "currency"`,
    );
  }
}
