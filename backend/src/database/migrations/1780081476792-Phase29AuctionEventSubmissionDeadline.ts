import { MigrationInterface, QueryRunner } from "typeorm";

export class Phase29AuctionEventSubmissionDeadline1780081476792 implements MigrationInterface {
    name = 'Phase29AuctionEventSubmissionDeadline1780081476792'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction_events" ADD "submissionDeadline" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction_events" DROP COLUMN "submissionDeadline"`);
    }
}
