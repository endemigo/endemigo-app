import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSellerAuctionTier1782771000000 implements MigrationInterface {
    name = 'AddSellerAuctionTier1782771000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "seller_profiles" ADD "canCreateIndependent" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "seller_profiles" ADD "canCreateJoint" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "seller_profiles" DROP COLUMN "canCreateJoint"`);
        await queryRunner.query(`ALTER TABLE "seller_profiles" DROP COLUMN "canCreateIndependent"`);
    }
}
