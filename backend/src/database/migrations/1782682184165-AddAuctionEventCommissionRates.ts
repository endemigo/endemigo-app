import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuctionEventCommissionRates1782682184165 implements MigrationInterface {
    name = 'AddAuctionEventCommissionRates1782682184165'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction_events" ADD "dealerCommissionRate" numeric(5,2)`);
        await queryRunner.query(`ALTER TABLE "auction_events" ADD "endemigoCommissionRate" numeric(5,2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction_events" DROP COLUMN "endemigoCommissionRate"`);
        await queryRunner.query(`ALTER TABLE "auction_events" DROP COLUMN "dealerCommissionRate"`);
    }
}
