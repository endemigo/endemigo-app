import { MigrationInterface, QueryRunner } from 'typeorm';

export class PersistAuctionPauseState1783500000000 implements MigrationInterface {
  name = 'PersistAuctionPauseState1783500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Pause/auto-progress durumu in-memory tutuluyordu; restart'ta kaybolmasın diye DB'ye taşındı.
    await queryRunner.query(
      `ALTER TABLE "auctions" ADD "pausedRemainingSeconds" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "auction_events" ADD "autoProgressEnabled" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auction_events" DROP COLUMN "autoProgressEnabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auctions" DROP COLUMN "pausedRemainingSeconds"`,
    );
  }
}
