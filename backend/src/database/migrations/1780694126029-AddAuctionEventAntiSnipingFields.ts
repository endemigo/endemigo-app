import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuctionEventAntiSnipingFields1780694126029 implements MigrationInterface {
    name = 'AddAuctionEventAntiSnipingFields1780694126029'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction_events" ADD "antiSnipingEnabled" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "auction_events" ADD "maxExtensions" integer NOT NULL DEFAULT '5'`);
        await queryRunner.query(`ALTER TABLE "auction_events" ADD "extensionSeconds" integer NOT NULL DEFAULT '60'`);
        await queryRunner.query(`ALTER TABLE "auction_events" ADD "extensionDuration" integer NOT NULL DEFAULT '60'`);
        await queryRunner.query(`ALTER TABLE "auctions" ADD "extensionDuration" integer NOT NULL DEFAULT '60'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auctions" DROP COLUMN "extensionDuration"`);
        await queryRunner.query(`ALTER TABLE "auction_events" DROP COLUMN "extensionDuration"`);
        await queryRunner.query(`ALTER TABLE "auction_events" DROP COLUMN "extensionSeconds"`);
        await queryRunner.query(`ALTER TABLE "auction_events" DROP COLUMN "maxExtensions"`);
        await queryRunner.query(`ALTER TABLE "auction_events" DROP COLUMN "antiSnipingEnabled"`);
    }
}
