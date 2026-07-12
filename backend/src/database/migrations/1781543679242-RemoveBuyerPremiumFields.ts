import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveBuyerPremiumFields1781543679242 implements MigrationInterface {
  name = 'RemoveBuyerPremiumFields1781543679242';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the column from auctions
    await queryRunner.query(
      `ALTER TABLE "auctions" DROP COLUMN IF EXISTS "buyerPremiumRate"`,
    );
    // Drop the column from bids
    await queryRunner.query(
      `ALTER TABLE "bids" DROP COLUMN IF EXISTS "premiumAmount"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auctions" ADD "buyerPremiumRate" decimal(5,4) NOT NULL DEFAULT 0.25`,
    );
    await queryRunner.query(
      `ALTER TABLE "bids" ADD "premiumAmount" decimal(12,2) NOT NULL DEFAULT 0`,
    );
  }
}
