import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase27AuctionReserveAndProxyBids1748200000000 implements MigrationInterface {
  name = 'Phase27AuctionReserveAndProxyBids1748200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE auctions
         ADD COLUMN IF NOT EXISTS "reservePrice" numeric(12,2) NULL,
         ADD COLUMN IF NOT EXISTS "reserveMet" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(
      `ALTER TABLE bids
         ADD COLUMN IF NOT EXISTS "maxAmount" numeric(12,2) NULL`,
    );

    await queryRunner.query(
      `UPDATE bids
         SET "maxAmount" = amount
       WHERE "maxAmount" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE bids
         DROP COLUMN IF EXISTS "maxAmount"`,
    );

    await queryRunner.query(
      `ALTER TABLE auctions
         DROP COLUMN IF EXISTS "reserveMet",
         DROP COLUMN IF EXISTS "reservePrice"`,
    );
  }
}
