import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderCommissionSplit1782770800000 implements MigrationInterface {
    name = 'AddOrderCommissionSplit1782770800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "eventId" uuid`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "dealerId" uuid`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "commissionRate" numeric(5,4) NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "commissionAmount" numeric(12,2) NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "platformCommissionAmount" numeric(12,2) NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "dealerCommissionAmount" numeric(12,2) NOT NULL DEFAULT 0`);
        // Platform (sistem) komisyon satırlarının kullanıcısı yok → userId nullable.
        await queryRunner.query(`ALTER TABLE "journal_lines" ALTER COLUMN "userId" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "journal_lines" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "dealerCommissionAmount"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "platformCommissionAmount"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "commissionAmount"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "commissionRate"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "dealerId"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "eventId"`);
    }
}
