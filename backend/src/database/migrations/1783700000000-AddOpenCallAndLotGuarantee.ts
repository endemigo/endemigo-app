import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOpenCallAndLotGuarantee1783700000000 implements MigrationInterface {
  name = 'AddOpenCallAndLotGuarantee1783700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ortak müzayedede açık ürün çağrısı (davetsiz katılım kapısı).
    await queryRunner.query(
      `ALTER TABLE "auction_events" ADD "openCallEnabled" boolean NOT NULL DEFAULT false`,
    );
    // Menşei/tedarik garantisi taahhüdünün lot bazında kaydı.
    await queryRunner.query(
      `ALTER TABLE "auctions" ADD "guaranteeAcceptedAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auctions" DROP COLUMN "guaranteeAcceptedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auction_events" DROP COLUMN "openCallEnabled"`,
    );
  }
}
