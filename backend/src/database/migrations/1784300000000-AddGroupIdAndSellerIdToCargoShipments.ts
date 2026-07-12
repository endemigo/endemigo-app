import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CargoShipment entity'si `groupId` ve `sellerId` kolonlarını (+ birleşik
 * kısmi unique index) tanımlıyordu ancak bunları ekleyen migration eksikti;
 * synchronize:false ortamlarda kolonlar hiç oluşmadığından grup bazlı kargo
 * sorguları (getOrderShipmentsForUser) "column does not exist" ile patlıyordu.
 */
export class AddGroupIdAndSellerIdToCargoShipments1784300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cargo_shipments" ADD COLUMN IF NOT EXISTS "groupId" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "cargo_shipments" ADD COLUMN IF NOT EXISTS "sellerId" uuid NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cargo_shipments_group_seller_type" ` +
        `ON "cargo_shipments" ("groupId", "sellerId", "shipmentType") ` +
        `WHERE "groupId" IS NOT NULL AND "sellerId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_cargo_shipments_group_seller_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cargo_shipments" DROP COLUMN IF EXISTS "sellerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cargo_shipments" DROP COLUMN IF EXISTS "groupId"`,
    );
  }
}
