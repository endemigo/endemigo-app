import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuctionRegistrationsTable1781896225406 implements MigrationInterface {
    name = 'CreateAuctionRegistrationsTable1781896225406'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "auction_registrations_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`);
        
        await queryRunner.query(`
            CREATE TABLE "auction_registrations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "auctionId" uuid,
                "eventId" uuid,
                "status" "auction_registrations_status_enum" NOT NULL DEFAULT 'PENDING',
                "acceptedTermsAt" TIMESTAMP NOT NULL DEFAULT now(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                CONSTRAINT "PK_auction_registrations" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`ALTER TABLE "auction_registrations" ADD CONSTRAINT "FK_auction_registrations_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "auction_registrations" ADD CONSTRAINT "FK_auction_registrations_auction" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "auction_registrations" ADD CONSTRAINT "FK_auction_registrations_event" FOREIGN KEY ("eventId") REFERENCES "auction_events"("id") ON DELETE SET NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction_registrations" DROP CONSTRAINT "FK_auction_registrations_event"`);
        await queryRunner.query(`ALTER TABLE "auction_registrations" DROP CONSTRAINT "FK_auction_registrations_auction"`);
        await queryRunner.query(`ALTER TABLE "auction_registrations" DROP CONSTRAINT "FK_auction_registrations_user"`);
        await queryRunner.query(`DROP TABLE "auction_registrations"`);
        await queryRunner.query(`DROP TYPE "auction_registrations_status_enum"`);
    }
}
