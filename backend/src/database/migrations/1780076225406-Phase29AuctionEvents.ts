import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase29AuctionEvents1780076225406 implements MigrationInterface {
  name = 'Phase29AuctionEvents1780076225406';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."auction_events_status_enum" AS ENUM('DRAFT', 'UPCOMING', 'ACTIVE', 'ENDED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."auction_events_auctiontype_enum" AS ENUM('REALTIME', 'TIMED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "auction_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "title" character varying NOT NULL, "description" text, "coverImageUrl" character varying, "status" "public"."auction_events_status_enum" NOT NULL DEFAULT 'DRAFT', "auctionType" "public"."auction_events_auctiontype_enum" NOT NULL DEFAULT 'REALTIME', "startTime" TIMESTAMP NOT NULL, "endTime" TIMESTAMP NOT NULL, "activeLotId" uuid, CONSTRAINT "PK_550171a39f9097852554f8eb51b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "auctions" ADD "eventId" uuid`);
    await queryRunner.query(
      `CREATE TYPE "public"."auctions_approvalstatus_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "auctions" ADD "approvalStatus" "public"."auctions_approvalstatus_enum" NOT NULL DEFAULT 'APPROVED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "auctions" ADD "sequenceNumber" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "auctions" ADD CONSTRAINT "FK_e2acfde7b2f6dafd1874b07d0c8" FOREIGN KEY ("eventId") REFERENCES "auction_events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auctions" DROP CONSTRAINT "FK_e2acfde7b2f6dafd1874b07d0c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auctions" DROP COLUMN "sequenceNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auctions" DROP COLUMN "approvalStatus"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."auctions_approvalstatus_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "auctions" DROP COLUMN "eventId"`);
    await queryRunner.query(`DROP TABLE "auction_events"`);
    await queryRunner.query(
      `DROP TYPE "public"."auction_events_auctiontype_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."auction_events_status_enum"`);
  }
}
