import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuctionIdAndCustomPriceToCartItems1782161158000 implements MigrationInterface {
  name = 'AddAuctionIdAndCustomPriceToCartItems1782161158000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cart_items" ADD "auctionId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD "customPrice" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_cart_items_auctions" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_cart_items_auctions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP COLUMN "customPrice"`,
    );
    await queryRunner.query(`ALTER TABLE "cart_items" DROP COLUMN "auctionId"`);
  }
}
