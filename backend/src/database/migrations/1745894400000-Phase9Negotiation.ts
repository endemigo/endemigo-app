import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase9Negotiation1745894400000 implements MigrationInterface {
  name = 'Phase9Negotiation1745894400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE negotiation_status AS ENUM ('OPEN','NEGOTIATING','OFFER_PENDING','ACCEPTED','PAYMENT_PENDING','COMPLETED','REJECTED','EXPIRED','CANCELLED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE offer_status AS ENUM ('PENDING','ACCEPTED','REJECTED','COUNTER_OFFERED','EXPIRED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE negotiation_message_type AS ENUM ('USER_MESSAGE','PRICE_REQUEST','OFFER','COUNTER_OFFER','SYSTEM','VIOLATION_BLOCKED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE violation_type AS ENUM ('URL','PHONE','IBAN','EMAIL','SOCIAL_HANDLE','PLATFORM_NAME'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TYPE admin_audit_action ADD VALUE IF NOT EXISTS 'NEGOTIATION_VIEWED'; EXCEPTION WHEN undefined_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TYPE admin_audit_logs_action_enum ADD VALUE IF NOT EXISTS 'NEGOTIATION_VIEWED'; EXCEPTION WHEN undefined_object THEN null; END $$;`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS negotiation_conversations (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "productId" uuid NOT NULL,
        "buyerId" uuid NOT NULL,
        "sellerId" uuid NOT NULL,
        quantity integer NOT NULL DEFAULT 1,
        status negotiation_status NOT NULL DEFAULT 'OPEN',
        "acceptedOfferId" uuid NULL,
        "orderId" uuid NULL,
        "paymentHoldExpiresAt" timestamptz NULL,
        "lastActivityAt" timestamptz NULL,
        "closedAt" timestamptz NULL,
        metadata jsonb NOT NULL DEFAULT '{}',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS negotiation_offers (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "conversationId" uuid NOT NULL,
        "senderId" uuid NOT NULL,
        amount numeric(12,2) NOT NULL,
        quantity integer NOT NULL DEFAULT 1,
        status offer_status NOT NULL DEFAULT 'PENDING',
        "expiryHours" integer NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "parentOfferId" uuid NULL,
        "orderId" uuid NULL,
        "acceptedAt" timestamptz NULL,
        "resolvedAt" timestamptz NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS negotiation_messages (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "conversationId" uuid NOT NULL,
        "senderId" uuid NULL,
        type negotiation_message_type NOT NULL,
        content text NOT NULL,
        "offerId" uuid NULL,
        metadata jsonb NOT NULL DEFAULT '{}',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS negotiation_violation_logs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "conversationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "attemptedContent" text NOT NULL,
        "violationTypes" violation_type[] NOT NULL DEFAULT '{}',
        "detectedPatterns" text[] NOT NULL DEFAULT '{}',
        "ipAddress" varchar NULL,
        "deviceId" varchar NULL,
        metadata jsonb NOT NULL DEFAULT '{}',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_negotiation_conversations_product_buyer_seller" ON negotiation_conversations ("productId", "buyerId", "sellerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_negotiation_conversations_buyer_status" ON negotiation_conversations ("buyerId", status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_negotiation_conversations_seller_status" ON negotiation_conversations ("sellerId", status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_negotiation_offers_conversation_status" ON negotiation_offers ("conversationId", status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_negotiation_offers_expires_at" ON negotiation_offers ("expiresAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_negotiation_messages_conversation_created" ON negotiation_messages ("conversationId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_negotiation_violation_logs_conversation_created" ON negotiation_violation_logs ("conversationId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_negotiation_violation_logs_user_created" ON negotiation_violation_logs ("userId", "createdAt")`,
    );

    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE negotiation_conversations ADD CONSTRAINT "FK_negotiation_conversations_product" FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE negotiation_conversations ADD CONSTRAINT "FK_negotiation_conversations_buyer" FOREIGN KEY ("buyerId") REFERENCES users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE negotiation_conversations ADD CONSTRAINT "FK_negotiation_conversations_seller" FOREIGN KEY ("sellerId") REFERENCES users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE negotiation_conversations ADD CONSTRAINT "FK_negotiation_conversations_order" FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE negotiation_offers ADD CONSTRAINT "FK_negotiation_offers_conversation" FOREIGN KEY ("conversationId") REFERENCES negotiation_conversations(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE negotiation_offers ADD CONSTRAINT "FK_negotiation_offers_sender" FOREIGN KEY ("senderId") REFERENCES users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE negotiation_messages ADD CONSTRAINT "FK_negotiation_messages_conversation" FOREIGN KEY ("conversationId") REFERENCES negotiation_conversations(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE negotiation_messages ADD CONSTRAINT "FK_negotiation_messages_sender" FOREIGN KEY ("senderId") REFERENCES users(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE negotiation_violation_logs ADD CONSTRAINT "FK_negotiation_violation_logs_conversation" FOREIGN KEY ("conversationId") REFERENCES negotiation_conversations(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE negotiation_violation_logs ADD CONSTRAINT "FK_negotiation_violation_logs_user" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS negotiation_violation_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS negotiation_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS negotiation_offers`);
    await queryRunner.query(`DROP TABLE IF EXISTS negotiation_conversations`);
    await queryRunner.query(`DROP TYPE IF EXISTS negotiation_message_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS offer_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS negotiation_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS violation_type`);
  }
}
