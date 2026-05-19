import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase26PostOrderReturnsCargoReviews1748100000000
  implements MigrationInterface
{
  name = 'Phase26PostOrderReturnsCargoReviews1748100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'RETURN_REQUESTED'`,
    );
    await queryRunner.query(
      `ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'RETURN_APPROVED'`,
    );
    await queryRunner.query(
      `ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'RETURN_REJECTED'`,
    );
    await queryRunner.query(
      `ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'RETURN_IN_TRANSIT'`,
    );
    await queryRunner.query(
      `ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'RETURN_DELIVERED'`,
    );
    await queryRunner.query(
      `ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'REFUND_PENDING'`,
    );
    await queryRunner.query(
      `ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'REFUNDED'`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE cargo_shipment_type AS ENUM ('FORWARD', 'RETURN');
       EXCEPTION
         WHEN duplicate_object THEN null;
       END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE cargo_event_source AS ENUM ('system', 'provider', 'user');
       EXCEPTION
         WHEN duplicate_object THEN null;
       END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE order_return_reason_code AS ENUM ('DAMAGED', 'NOT_AS_DESCRIBED', 'WRONG_ITEM', 'MISSING_PARTS', 'OTHER');
       EXCEPTION
         WHEN duplicate_object THEN null;
       END $$;`,
    );

    await queryRunner.query(
      `ALTER TABLE orders
         ADD COLUMN IF NOT EXISTS "returnReasonCode" order_return_reason_code NULL,
         ADD COLUMN IF NOT EXISTS "returnReasonNote" text NULL,
         ADD COLUMN IF NOT EXISTS "returnShipmentId" uuid NULL,
         ADD COLUMN IF NOT EXISTS "returnRequestedAt" timestamptz NULL,
         ADD COLUMN IF NOT EXISTS "returnApprovedAt" timestamptz NULL,
         ADD COLUMN IF NOT EXISTS "returnDeliveredAt" timestamptz NULL,
         ADD COLUMN IF NOT EXISTS "refundedAt" timestamptz NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE cargo_shipments
         ADD COLUMN IF NOT EXISTS "shipmentType" cargo_shipment_type NOT NULL DEFAULT 'FORWARD',
         ADD COLUMN IF NOT EXISTS "externalTrackingUrl" varchar NULL,
         ADD COLUMN IF NOT EXISTS "carrierReference" varchar NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE cargo_shipments DROP CONSTRAINT IF EXISTS "cargo_shipments_orderId_key"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cargo_shipments_order_type" ON cargo_shipments ("orderId", "shipmentType")`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS cargo_shipment_events (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "shipmentId" uuid NOT NULL,
        status cargo_status NOT NULL,
        title varchar NOT NULL,
        detail text NULL,
        source cargo_event_source NOT NULL DEFAULT 'system',
        "occurredAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cargo_shipment_events_shipment_occurred" ON cargo_shipment_events ("shipmentId", "occurredAt")`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS order_reviews (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL UNIQUE,
        "productId" uuid NOT NULL,
        "sellerId" uuid NOT NULL,
        "buyerId" uuid NOT NULL,
        "productRating" integer NOT NULL,
        "productComment" text NULL,
        "sellerRating" integer NOT NULL,
        "sellerComment" text NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_order_reviews_product" ON order_reviews ("productId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_order_reviews_seller" ON order_reviews ("sellerId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_reviews_seller"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_reviews_product"`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_reviews`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_cargo_shipment_events_shipment_occurred"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS cargo_shipment_events`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_cargo_shipments_order_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE cargo_shipments
         DROP COLUMN IF EXISTS "carrierReference",
         DROP COLUMN IF EXISTS "externalTrackingUrl",
         DROP COLUMN IF EXISTS "shipmentType"`,
    );
    await queryRunner.query(
      `ALTER TABLE cargo_shipments ADD CONSTRAINT "cargo_shipments_orderId_key" UNIQUE ("orderId")`,
    );

    await queryRunner.query(
      `ALTER TABLE orders
         DROP COLUMN IF EXISTS "refundedAt",
         DROP COLUMN IF EXISTS "returnDeliveredAt",
         DROP COLUMN IF EXISTS "returnApprovedAt",
         DROP COLUMN IF EXISTS "returnRequestedAt",
         DROP COLUMN IF EXISTS "returnShipmentId",
         DROP COLUMN IF EXISTS "returnReasonNote",
         DROP COLUMN IF EXISTS "returnReasonCode"`,
    );

    await queryRunner.query(`DROP TYPE IF EXISTS order_return_reason_code`);
    await queryRunner.query(`DROP TYPE IF EXISTS cargo_event_source`);
    await queryRunner.query(`DROP TYPE IF EXISTS cargo_shipment_type`);
  }
}
