import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuctionSaleApproval1783600000000 implements MigrationInterface {
    name = 'AddAuctionSaleApproval1783600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Satış onayı kapısı: admin/organizatör onaylamadan kazanana ödeme açılmaz.
        await queryRunner.query(`ALTER TABLE "auctions" ADD "saleApprovedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "auctions" ADD "saleApprovedBy" uuid`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auctions" DROP COLUMN "saleApprovedBy"`);
        await queryRunner.query(`ALTER TABLE "auctions" DROP COLUMN "saleApprovedAt"`);
    }
}
