import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBuyItNowPrice1782642705175 implements MigrationInterface {
  name = 'AddBuyItNowPrice1782642705175';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auctions" ADD "buyItNowPrice" numeric(12,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auctions" DROP COLUMN "buyItNowPrice"`,
    );
  }
}
