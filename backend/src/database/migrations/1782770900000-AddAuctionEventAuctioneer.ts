import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuctionEventAuctioneer1782770900000 implements MigrationInterface {
    name = 'AddAuctionEventAuctioneer1782770900000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction_events" ADD "auctioneerId" uuid`);
        // Mevcut etkinliklerde varsayılan: yayıncı = sahip.
        await queryRunner.query(`UPDATE "auction_events" SET "auctioneerId" = "ownerId" WHERE "ownerId" IS NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction_events" DROP COLUMN "auctioneerId"`);
    }
}
