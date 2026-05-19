import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase29AuctionBidIntegrityGuards1748500000000 implements MigrationInterface {
  name = 'Phase29AuctionBidIntegrityGuards1748500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_bids_one_winning_per_auction"
         ON bids ("auctionId")
       WHERE "isWinningBid" = true`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bids_auction_status_amount"
         ON bids ("auctionId", status, amount)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_bids_auction_status_amount"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_bids_one_winning_per_auction"`,
    );
  }
}
