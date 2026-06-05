import { MigrationInterface, QueryRunner } from "typeorm";

export class Phase29AuctionEventStatusApplication1780084000000 implements MigrationInterface {
    name = 'Phase29AuctionEventStatusApplication1780084000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."auction_events_status_enum" ADD VALUE IF NOT EXISTS 'APPLICATION'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL does not support dropping enum values in transactions, so down is a no-op
    }
}
