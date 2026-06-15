import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuctionEventAuditActions1780697000000 implements MigrationInterface {
    name = 'AddAuctionEventAuditActions1780697000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "admin_audit_action" ADD VALUE 'AUCTION_EVENT_CREATED'`);
        await queryRunner.query(`ALTER TYPE "admin_audit_action" ADD VALUE 'AUCTION_EVENT_UPDATED'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
