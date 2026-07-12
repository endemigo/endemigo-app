import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase8AdminMonetizationFoundation1745808000000 implements MigrationInterface {
  name = 'Phase8AdminMonetizationFoundation1745808000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN','OPERATIONS','FINANCE','SUPPORT'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE admin_audit_action AS ENUM ('ADMIN_LOGIN','SELLER_APPROVED','SELLER_REJECTED','USER_RESTRICTED','USER_REACTIVATED','PRODUCT_REMOVED','AUCTION_CANCELLED','ORDER_MARKED_ADMIN_REVIEW','PAYMENT_MARKED_ADMIN_REVIEW','AD_APPROVED','AD_REJECTED','PAYOUT_APPROVED','PAYOUT_REJECTED','CAMPAIGN_APPROVED','MEMBERSHIP_CHANGED','SETTING_UPDATED','TRUST_REVIEWED','CATEGORY_CREATED','CATEGORY_UPDATED','CATEGORY_DELETED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE admin_setting_key AS ENUM ('COMMISSION_DEFAULT_RATE','ESCROW_AUTO_CONFIRM_HOURS','CARGO_MOCK_ENABLED','NOTIFICATION_TEMPLATE_OVERRIDES','AD_SPONSORED_DENSITY','TRUST_GRACE_DAYS'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE admin_audit_target_type AS ENUM ('USER','SELLER','PRODUCT','CATEGORY','AUCTION','ORDER','PAYMENT','PAYOUT','AD','CAMPAIGN','COUPON','MEMBERSHIP','TRUST','SETTING'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE ad_placement_type AS ENUM ('SEARCH_PROMOTION','CATEGORY_SHOWCASE','HOME_BANNER'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE ad_request_status AS ENUM ('DRAFT','REQUESTED','ADMIN_REVIEW','APPROVED','SCHEDULED','ACTIVE','REJECTED','CANCELLED','COMPLETED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE campaign_status AS ENUM ('DRAFT','ACTIVE','SCHEDULED','EXPIRED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE campaign_discount_type AS ENUM ('PERCENTAGE','FIXED_AMOUNT','TIERED_AMOUNT','TIERED_QUANTITY'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE campaign_scope_type AS ENUM ('PRODUCT','CATEGORY'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE coupon_status AS ENUM ('DRAFT','ACTIVE','EXPIRED','DISABLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE membership_status AS ENUM ('FREE','ACTIVE','GRACE','CANCELLED','EXPIRED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE membership_period AS ENUM ('MONTHLY','YEARLY'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE trust_badge_level AS ENUM ('NEW','TRUSTED','HIGHLY_TRUSTED','RESTRICTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE trust_flag_type AS ENUM ('IP_DEVICE','PHONE','OFF_PLATFORM','PAYMENT','ORDER','MANUAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE trust_flag_status AS ENUM ('PENDING_REVIEW','UNDER_REVIEW','RESOLVED','DISMISSED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE restriction_type AS ENUM ('WARNING','ADS_CAMPAIGNS_LOCK','PAYOUT_MANUAL_REVIEW','SELLING_RESTRICTED','MEMBERSHIP_CANCELLED','ACCOUNT_SUSPENDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE restriction_status AS ENUM ('PENDING_REVIEW','ACTIVE','RESOLVED','EXPIRED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS admin_users (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), email varchar NOT NULL UNIQUE, "passwordHash" varchar NOT NULL, "displayName" varchar NOT NULL, roles admin_role[] NOT NULL DEFAULT ARRAY['SUPPORT']::admin_role[], "isActive" boolean NOT NULL DEFAULT true, "lastLoginAt" timestamptz NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS admin_audit_logs (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "actorAdminId" uuid NOT NULL, "actorRoles" admin_role[] NOT NULL DEFAULT '{}', action admin_audit_action NOT NULL, "targetType" admin_audit_target_type NOT NULL, "targetId" varchar NOT NULL, reason text NULL, before jsonb NOT NULL DEFAULT '{}', after jsonb NOT NULL DEFAULT '{}', metadata jsonb NOT NULL DEFAULT '{}', "ipAddress" varchar NULL, "userAgent" varchar NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS admin_settings (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), key admin_setting_key NOT NULL UNIQUE, value jsonb NOT NULL DEFAULT '{}', description text NULL, "isSensitive" boolean NOT NULL DEFAULT false, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS ad_packages (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name varchar NOT NULL, "placementType" ad_placement_type NOT NULL, price numeric(12,2) NOT NULL, currency varchar(3) NOT NULL DEFAULT 'TRY', "durationDays" integer NOT NULL, "isActive" boolean NOT NULL DEFAULT true, metadata jsonb NOT NULL DEFAULT '{}', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS ad_requests (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "sellerId" uuid NOT NULL, "productId" uuid NULL, "packageId" uuid NOT NULL, "placementType" ad_placement_type NOT NULL, status ad_request_status NOT NULL DEFAULT 'ADMIN_REVIEW', amount numeric(12,2) NOT NULL, currency varchar(3) NOT NULL DEFAULT 'TRY', "walletHoldId" uuid NULL, "reviewReason" text NULL, "approvedAt" timestamptz NULL, "rejectedAt" timestamptz NULL, "publishedAt" timestamptz NULL, "startsAt" timestamptz NULL, "endsAt" timestamptz NULL, "idempotencyKey" varchar NOT NULL, metadata jsonb NOT NULL DEFAULT '{}', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL, CONSTRAINT uq_ad_requests_seller_idempotency UNIQUE ("sellerId", "idempotencyKey"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS ad_placements (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "adRequestId" uuid NOT NULL, "placementType" ad_placement_type NOT NULL, "categoryId" uuid NULL, "slotKey" varchar NULL, "startsAt" timestamptz NOT NULL, "endsAt" timestamptz NOT NULL, "isActive" boolean NOT NULL DEFAULT true, impressions integer NOT NULL DEFAULT 0, clicks integer NOT NULL DEFAULT 0, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS campaigns (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "sellerId" uuid NULL, name varchar NOT NULL, status campaign_status NOT NULL DEFAULT 'DRAFT', "startsAt" timestamptz NOT NULL, "endsAt" timestamptz NOT NULL, "isPlatform" boolean NOT NULL DEFAULT false, "requiresSellerOptIn" boolean NOT NULL DEFAULT false, metadata jsonb NOT NULL DEFAULT '{}', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS campaign_rules (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "campaignId" uuid NOT NULL, "discountType" campaign_discount_type NOT NULL, "discountValue" numeric(12,2) NOT NULL, "scopeType" campaign_scope_type NOT NULL, "scopeId" uuid NOT NULL, "minAmount" numeric(12,2) NULL, "minQuantity" integer NULL, tiers jsonb NOT NULL DEFAULT '[]', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS coupons (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "sellerId" uuid NULL, code varchar NOT NULL, status coupon_status NOT NULL DEFAULT 'DRAFT', "discountType" campaign_discount_type NOT NULL, "discountValue" numeric(12,2) NOT NULL, "startsAt" timestamptz NOT NULL, "endsAt" timestamptz NOT NULL, "minAmount" numeric(12,2) NULL, "maxUses" integer NULL, "perUserLimit" integer NOT NULL DEFAULT 1, "scopeType" campaign_scope_type NULL, "scopeId" uuid NULL, metadata jsonb NOT NULL DEFAULT '{}', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL, CONSTRAINT uq_coupons_seller_code UNIQUE ("sellerId", code))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS coupon_redemptions (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "couponId" uuid NOT NULL, "userId" uuid NOT NULL, "orderId" uuid NOT NULL, "discountAmount" numeric(12,2) NOT NULL, currency varchar(3) NOT NULL DEFAULT 'TRY', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL, CONSTRAINT uq_coupon_redemptions_order UNIQUE ("orderId"), CONSTRAINT uq_coupon_redemptions_coupon_user_order UNIQUE ("couponId", "userId", "orderId"))`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS membership_packages (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name varchar NOT NULL, description text NULL, "isActive" boolean NOT NULL DEFAULT true, "monthlyPrice" numeric(12,2) NOT NULL DEFAULT 0, "yearlyPrice" numeric(12,2) NOT NULL DEFAULT 0, currency varchar(3) NOT NULL DEFAULT 'TRY', benefits jsonb NOT NULL DEFAULT '{}', metadata jsonb NOT NULL DEFAULT '{}', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS membership_subscriptions (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "sellerId" uuid NOT NULL, "packageId" uuid NOT NULL, status membership_status NOT NULL DEFAULT 'FREE', period membership_period NOT NULL DEFAULT 'MONTHLY', "startsAt" timestamptz NOT NULL DEFAULT now(), "currentPeriodEndsAt" timestamptz NULL, "graceEndsAt" timestamptz NULL, "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false, "providerSubscriptionId" varchar NULL, metadata jsonb NOT NULL DEFAULT '{}', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS trust_scores (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "sellerId" uuid NOT NULL UNIQUE, score integer NOT NULL DEFAULT 0, "badgeLevel" trust_badge_level NOT NULL DEFAULT 'NEW', "transactionCompletionRate" numeric(5,2) NOT NULL DEFAULT 0, "paymentReliabilityScore" numeric(5,2) NOT NULL DEFAULT 0, "restrictionCount" integer NOT NULL DEFAULT 0, "lastCalculatedAt" timestamptz NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS trust_flags (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "targetUserId" uuid NOT NULL, "sellerId" uuid NULL, "flagType" trust_flag_type NOT NULL, severity integer NOT NULL DEFAULT 1, status trust_flag_status NOT NULL DEFAULT 'PENDING_REVIEW', evidence jsonb NOT NULL DEFAULT '{}', "reviewReason" text NULL, "reviewedAt" timestamptz NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS account_restrictions (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "targetUserId" uuid NOT NULL, "sellerId" uuid NULL, "restrictionType" restriction_type NOT NULL, status restriction_status NOT NULL DEFAULT 'PENDING_REVIEW', reason text NOT NULL, "startsAt" timestamptz NOT NULL DEFAULT now(), "endsAt" timestamptz NULL, metadata jsonb NOT NULL DEFAULT '{}', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_admin_audit_logs_target" ON admin_audit_logs ("targetType", "targetId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_admin_audit_logs_actor_created" ON admin_audit_logs ("actorAdminId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ad_requests_status_seller" ON ad_requests (status, "sellerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ad_placements_schedule" ON ad_placements ("placementType", "categoryId", "slotKey", "startsAt", "endsAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_campaigns_status_seller" ON campaigns (status, "sellerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_coupons_status_code" ON coupons (status, code)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_membership_subscriptions_one_active" ON membership_subscriptions ("sellerId") WHERE status IN ('ACTIVE','GRACE') AND "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_trust_flags_status_seller" ON trust_flags (status, "sellerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_account_restrictions_status_seller" ON account_restrictions (status, "sellerId", "restrictionType")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS account_restrictions`);
    await queryRunner.query(`DROP TABLE IF EXISTS trust_flags`);
    await queryRunner.query(`DROP TABLE IF EXISTS trust_scores`);
    await queryRunner.query(`DROP TABLE IF EXISTS membership_subscriptions`);
    await queryRunner.query(`DROP TABLE IF EXISTS membership_packages`);
    await queryRunner.query(`DROP TABLE IF EXISTS coupon_redemptions`);
    await queryRunner.query(`DROP TABLE IF EXISTS coupons`);
    await queryRunner.query(`DROP TABLE IF EXISTS campaign_rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS campaigns`);
    await queryRunner.query(`DROP TABLE IF EXISTS ad_placements`);
    await queryRunner.query(`DROP TABLE IF EXISTS ad_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS ad_packages`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin_settings`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin_audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin_users`);

    await queryRunner.query(`DROP TYPE IF EXISTS restriction_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS restriction_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS trust_flag_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS trust_flag_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS trust_badge_level`);
    await queryRunner.query(`DROP TYPE IF EXISTS membership_period`);
    await queryRunner.query(`DROP TYPE IF EXISTS membership_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS coupon_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS campaign_scope_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS campaign_discount_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS campaign_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS ad_request_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS ad_placement_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS admin_audit_target_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS admin_setting_key`);
    await queryRunner.query(`DROP TYPE IF EXISTS admin_audit_action`);
    await queryRunner.query(`DROP TYPE IF EXISTS admin_role`);
  }
}
