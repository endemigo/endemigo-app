import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase30NewAuctionRules1782158400000 implements MigrationInterface {
  name = 'Phase30NewAuctionRules1782158400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create enums
    await queryRunner.query(
      `CREATE TYPE "public"."auction_event_invitations_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."auction_events_eventtype_enum" AS ENUM('INDEPENDENT', 'JOINT', 'ENDEMIGO_MANAGED')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."auction_events_jointmanagementtype_enum" AS ENUM('SELF_MANAGED', 'ENDEMIGO_SUPPORTED')`
    );

    // 2. Add columns to auction_events
    await queryRunner.query(`ALTER TABLE "auction_events" ADD "ownerId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "auction_events" ADD "eventType" "public"."auction_events_eventtype_enum" NOT NULL DEFAULT 'ENDEMIGO_MANAGED'`
    );
    await queryRunner.query(
      `ALTER TABLE "auction_events" ADD "jointManagementType" "public"."auction_events_jointmanagementtype_enum"`
    );
    await queryRunner.query(
      `ALTER TABLE "auction_events" ADD "minProductsCount" integer NOT NULL DEFAULT '0'`
    );
    await queryRunner.query(
      `ALTER TABLE "auction_events" ADD "maxProductsCount" integer NOT NULL DEFAULT '0'`
    );

    // 3. Add columns to seller_profiles
    await queryRunner.query(
      `ALTER TABLE "seller_profiles" ADD "independentPreContractAcceptedAt" TIMESTAMP`
    );
    await queryRunner.query(
      `ALTER TABLE "seller_profiles" ADD "jointPreContractAcceptedAt" TIMESTAMP`
    );

    // 4. Create auction_event_invitations table
    await queryRunner.query(
      `CREATE TABLE "auction_event_invitations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "eventId" uuid NOT NULL,
        "inviteeId" uuid NOT NULL,
        "status" "public"."auction_event_invitations_status_enum" NOT NULL DEFAULT 'PENDING',
        CONSTRAINT "PK_auction_event_invitations" PRIMARY KEY ("id")
      )`
    );

    // 5. Add Foreign Key constraints
    await queryRunner.query(
      `ALTER TABLE "auction_events" ADD CONSTRAINT "FK_auction_events_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "auction_event_invitations" ADD CONSTRAINT "FK_auction_event_invitations_event" FOREIGN KEY ("eventId") REFERENCES "auction_events"("id") ON DELETE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE "auction_event_invitations" ADD CONSTRAINT "FK_auction_event_invitations_invitee" FOREIGN KEY ("inviteeId") REFERENCES "users"("id") ON DELETE CASCADE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove Foreign Keys
    await queryRunner.query(
      `ALTER TABLE "auction_event_invitations" DROP CONSTRAINT "FK_auction_event_invitations_invitee"`
    );
    await queryRunner.query(
      `ALTER TABLE "auction_event_invitations" DROP CONSTRAINT "FK_auction_event_invitations_event"`
    );
    await queryRunner.query(
      `ALTER TABLE "auction_events" DROP CONSTRAINT "FK_auction_events_owner"`
    );

    // 2. Drop table
    await queryRunner.query(`DROP TABLE "auction_event_invitations"`);

    // 3. Drop columns from seller_profiles
    await queryRunner.query(
      `ALTER TABLE "seller_profiles" DROP COLUMN "jointPreContractAcceptedAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "seller_profiles" DROP COLUMN "independentPreContractAcceptedAt"`
    );

    // 4. Drop columns from auction_events
    await queryRunner.query(
      `ALTER TABLE "auction_events" DROP COLUMN "maxProductsCount"`
    );
    await queryRunner.query(
      `ALTER TABLE "auction_events" DROP COLUMN "minProductsCount"`
    );
    await queryRunner.query(
      `ALTER TABLE "auction_events" DROP COLUMN "jointManagementType"`
    );
    await queryRunner.query(`ALTER TABLE "auction_events" DROP COLUMN "eventType"`);
    await queryRunner.query(`ALTER TABLE "auction_events" DROP COLUMN "ownerId"`);

    // 5. Drop enums
    await queryRunner.query(
      `DROP TYPE "public"."auction_events_jointmanagementtype_enum"`
    );
    await queryRunner.query(
      `DROP TYPE "public"."auction_events_eventtype_enum"`
    );
    await queryRunner.query(
      `DROP TYPE "public"."auction_event_invitations_status_enum"`
    );
  }
}
