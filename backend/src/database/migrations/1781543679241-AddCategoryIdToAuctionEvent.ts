import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryIdToAuctionEvent1781543679241 implements MigrationInterface {
  name = 'AddCategoryIdToAuctionEvent1781543679241';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auction_events" ADD "categoryId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "auction_events" ADD CONSTRAINT "FK_auction_events_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auction_events" DROP CONSTRAINT "FK_auction_events_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auction_events" DROP COLUMN "categoryId"`,
    );
  }
}
