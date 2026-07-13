import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizerNameToAuctionEvent1784400000000 implements MigrationInterface {
  name = 'AddOrganizerNameToAuctionEvent1784400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE auction_events
         ADD COLUMN IF NOT EXISTS "organizerName" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE auction_events DROP COLUMN IF EXISTS "organizerName"`,
    );
  }
}
