import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase25ContentStudioStorageSeparation1748000000000 implements MigrationInterface {
  name = 'Phase25ContentStudioStorageSeparation1748000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS content_studio_documents (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), document jsonb NOT NULL DEFAULT '{}', "updatedByAdminId" uuid NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_content_studio_documents_createdAt" ON content_studio_documents ("createdAt")`,
    );

    await queryRunner.query(
      `INSERT INTO content_studio_documents (document, "updatedByAdminId", "createdAt", "updatedAt")
       SELECT s.value, NULL, COALESCE(s."createdAt", now()), COALESCE(s."updatedAt", now())
       FROM admin_settings s
       WHERE s.key::text = 'CONTENT_STUDIO'
         AND s."deletedAt" IS NULL
       ORDER BY s."updatedAt" DESC
       LIMIT 1`,
    );

    await queryRunner.query(
      `DELETE FROM admin_settings WHERE key::text = 'CONTENT_STUDIO'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
         ALTER TYPE admin_setting_key ADD VALUE IF NOT EXISTS 'CONTENT_STUDIO';
       EXCEPTION
         WHEN duplicate_object THEN null;
       END $$;`,
    );

    await queryRunner.query(
      `INSERT INTO admin_settings (key, value, description, "isSensitive", "createdAt", "updatedAt")
       SELECT 'CONTENT_STUDIO'::admin_setting_key,
              d.document,
              'Icerik studyo dokumani: blog, banner, popup, bulten ve operasyon koleksiyonlari',
              false,
              COALESCE(d."createdAt", now()),
              COALESCE(d."updatedAt", now())
       FROM content_studio_documents d
       WHERE d."deletedAt" IS NULL
       ORDER BY d."updatedAt" DESC
       LIMIT 1
       ON CONFLICT (key) DO NOTHING`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS content_studio_documents`);
  }
}
