import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6TransactionFoundation1745716000000 implements MigrationInterface {
  name = 'Phase6TransactionFoundation1745716000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE ledger_account_type AS ENUM ('BUYER_CASH','SELLER_AVAILABLE','SELLER_PENDING','ESCROW','PLATFORM_FEE','PAYOUT_RESERVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE ledger_direction AS ENUM ('DEBIT','CREDIT'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE ledger_reference_type AS ENUM ('AUCTION_HOLD','PAYMENT','ORDER','REFUND','PAYOUT_REQUEST','ADJUSTMENT'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('PENDING','AUTHORIZED','ESCROW_HELD','FAILED','ADMIN_REVIEW','REFUNDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE payment_provider AS ENUM ('IYZICO'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE payout_request_status AS ENUM ('REQUESTED','ADMIN_REVIEW','APPROVED','REJECTED','PAID','CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE order_status AS ENUM ('CREATED','PAYMENT_PENDING','ESCROW_HELD','PREPARING_SHIPMENT','IN_TRANSIT','DELIVERED','COMPLETED','CANCELLED','FAILED','ADMIN_REVIEW'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE order_source AS ENUM ('AUCTION','DIRECT_SALE','ASK_PRICE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE escrow_status AS ENUM ('NOT_FUNDED','HELD','RELEASED','REFUNDED','ADMIN_REVIEW'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE cargo_status AS ENUM ('PREPARING','IN_TRANSIT','DELIVERED','FAILED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE cargo_provider AS ENUM ('MOCK'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE notification_event_type AS ENUM ('AUCTION_OUTBID','AUCTION_STARTED','AUCTION_ENDED','AUCTION_WON','PAYMENT_REMINDER','PAYMENT_CONFIRMED','PAYMENT_FAILED','PAYMENT_REFUNDED','ORDER_STATUS_CHANGED','CARGO_STATUS_CHANGED','PAYOUT_REQUEST_APPROVED','PAYOUT_REQUEST_REJECTED','ASK_PRICE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE notification_delivery_status AS ENUM ('PENDING','SENT','FAILED','NO_PUSH_SUBSCRIPTION'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS ledger_accounts (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "ownerId" uuid NULL, type ledger_account_type NOT NULL, currency varchar(3) NOT NULL DEFAULT 'TRY', "postedBalance" numeric(12,2) NOT NULL DEFAULT 0, "isActive" boolean NOT NULL DEFAULT true, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL, CONSTRAINT uq_ledger_accounts_owner_type_currency UNIQUE ("ownerId", type, currency))`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS journal_entries (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), type varchar NOT NULL, status varchar NOT NULL DEFAULT 'POSTED', "referenceType" ledger_reference_type NOT NULL, "referenceId" varchar NOT NULL, "idempotencyKey" varchar NOT NULL UNIQUE, description varchar NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS journal_lines (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "entryId" uuid NOT NULL, "accountId" uuid NOT NULL, "userId" uuid NOT NULL, direction ledger_direction NOT NULL, amount numeric(12,2) NOT NULL, currency varchar(3) NOT NULL DEFAULT 'TRY', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS payments (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "buyerId" uuid NOT NULL, "orderId" uuid NULL, amount numeric(12,2) NOT NULL, currency varchar(3) NOT NULL DEFAULT 'TRY', provider payment_provider NOT NULL DEFAULT 'IYZICO', status payment_status NOT NULL DEFAULT 'PENDING', "idempotencyKey" varchar NOT NULL UNIQUE, "checkoutToken" varchar NULL, "checkoutUrl" varchar NULL, "providerPaymentId" varchar NULL, "refundProviderId" varchar NULL, metadata jsonb NOT NULL DEFAULT '{}', "paidAt" timestamptz NULL, "refundedAt" timestamptz NULL, "adminReviewAt" timestamptz NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS payment_provider_events (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), provider payment_provider NOT NULL DEFAULT 'IYZICO', "eventKey" varchar NOT NULL UNIQUE, "paymentId" uuid NULL, "providerPaymentId" varchar NULL, payload jsonb NOT NULL DEFAULT '{}', "processedAt" timestamptz NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS orders (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "buyerId" uuid NOT NULL, "sellerId" uuid NOT NULL, "productId" uuid NOT NULL, source order_source NOT NULL, "sourceReferenceId" varchar NOT NULL, amount numeric(12,2) NOT NULL, currency varchar(3) NOT NULL DEFAULT 'TRY', status order_status NOT NULL DEFAULT 'CREATED', "escrowStatus" escrow_status NOT NULL DEFAULT 'NOT_FUNDED', "paymentId" uuid NULL, "autoConfirmAt" timestamptz NULL, "deliveryConfirmedAt" timestamptz NULL, "completedAt" timestamptz NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL, CONSTRAINT uq_orders_source_reference UNIQUE (source, "sourceReferenceId"))`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS order_audit_events (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "fromStatus" order_status NULL, "toStatus" order_status NOT NULL, "actorId" uuid NULL, reason varchar NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS cargo_shipments (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL UNIQUE, "trackingNumber" varchar NOT NULL UNIQUE, provider cargo_provider NOT NULL DEFAULT 'MOCK', status cargo_status NOT NULL DEFAULT 'PREPARING', "lastEventAt" timestamptz NULL, "deliveredAt" timestamptz NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS notifications (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "eventId" varchar NOT NULL, "eventType" notification_event_type NOT NULL, title varchar NOT NULL, body text NOT NULL, "relatedEntityType" varchar NULL, "relatedEntityId" varchar NULL, "deliveryStatus" notification_delivery_status NOT NULL DEFAULT 'PENDING', "providerMessageId" varchar NULL, "readAt" timestamptz NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL, CONSTRAINT uq_notifications_user_event UNIQUE ("userId", "eventId"))`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS notification_preferences (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL UNIQUE, channels jsonb NOT NULL DEFAULT '{}', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS payout_requests (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "sellerId" uuid NOT NULL, amount numeric(12,2) NOT NULL, currency varchar(3) NOT NULL DEFAULT 'TRY', status payout_request_status NOT NULL DEFAULT 'REQUESTED', "idempotencyKey" varchar NOT NULL, "payoutMethodMetadata" jsonb NOT NULL DEFAULT '{}', "reviewReason" varchar NULL, "manualPayoutReference" varchar NULL, "reviewedAt" timestamptz NULL, "approvedAt" timestamptz NULL, "rejectedAt" timestamptz NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL, CONSTRAINT uq_payout_requests_seller_idempotency UNIQUE ("sellerId", "idempotencyKey"))`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "askPriceEnabled" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "askPriceMinAmount" numeric(12,2) NULL`);
    await queryRunner.query(`ALTER TABLE wallet_holds ADD COLUMN IF NOT EXISTS "idempotencyKey" varchar NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wallet_holds_idempotencyKey" ON wallet_holds ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS payout_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_preferences`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS cargo_shipments`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_audit_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_provider_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS payments`);
    await queryRunner.query(`DROP TABLE IF EXISTS journal_lines`);
    await queryRunner.query(`DROP TABLE IF EXISTS journal_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS ledger_accounts`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "askPriceMinAmount"`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "askPriceEnabled"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_holds_idempotencyKey"`);
    await queryRunner.query(`ALTER TABLE wallet_holds DROP COLUMN IF EXISTS "idempotencyKey"`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_delivery_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_event_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS cargo_provider`);
    await queryRunner.query(`DROP TYPE IF EXISTS cargo_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS escrow_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_source`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS payout_request_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_provider`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS ledger_reference_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS ledger_direction`);
    await queryRunner.query(`DROP TYPE IF EXISTS ledger_account_type`);
  }
}
