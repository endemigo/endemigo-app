import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase28AuctionWinnerPaymentFlow1748300000000 implements MigrationInterface {
  name = 'Phase28AuctionWinnerPaymentFlow1748300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "bids_status_enum" ADD VALUE IF NOT EXISTS 'EXPIRED'`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'auctions_winnerPaymentStatus_enum'
        ) THEN
          CREATE TYPE "auctions_winnerPaymentStatus_enum" AS ENUM ('NONE', 'PENDING', 'PAID', 'EXPIRED');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(
      `ALTER TABLE auctions
         ADD COLUMN IF NOT EXISTS "winnerPaymentStatus" "auctions_winnerPaymentStatus_enum" NOT NULL DEFAULT 'NONE',
         ADD COLUMN IF NOT EXISTS "winnerPaymentDeadlineAt" timestamptz NULL,
         ADD COLUMN IF NOT EXISTS "winnerPaymentCompletedAt" timestamptz NULL,
         ADD COLUMN IF NOT EXISTS "winningBidId" uuid NULL,
         ADD COLUMN IF NOT EXISTS "orderId" uuid NULL,
         ADD COLUMN IF NOT EXISTS "fallbackRound" integer NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS "paymentAttemptCount" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE auctions
         DROP COLUMN IF EXISTS "paymentAttemptCount",
         DROP COLUMN IF EXISTS "fallbackRound",
         DROP COLUMN IF EXISTS "orderId",
         DROP COLUMN IF EXISTS "winningBidId",
         DROP COLUMN IF EXISTS "winnerPaymentCompletedAt",
         DROP COLUMN IF EXISTS "winnerPaymentDeadlineAt",
         DROP COLUMN IF EXISTS "winnerPaymentStatus"`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "auctions_winnerPaymentStatus_enum"`,
    );
  }
}
