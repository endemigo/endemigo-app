import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLotTransitionSeconds1780696000000 implements MigrationInterface {
    name = 'AddLotTransitionSeconds1780696000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction_events" ADD "lotTransitionSeconds" integer NOT NULL DEFAULT 30`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction_events" DROP COLUMN "lotTransitionSeconds"`);
    }
}
