import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSavedCardsTable1782074984302 implements MigrationInterface {
    name = 'CreateSavedCardsTable1782074984302'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "saved_cards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "cardHolderName" character varying NOT NULL, "maskedPan" character varying NOT NULL, "cardToken" character varying NOT NULL, CONSTRAINT "PK_00718d0da00daa3aec1e7881cbc" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "saved_cards"`);
    }
}
