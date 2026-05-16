import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContentStudioAdminSetting1747314000000
  implements MigrationInterface
{
  name = 'AddContentStudioAdminSetting1747314000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TYPE admin_setting_key ADD VALUE IF NOT EXISTS 'CONTENT_STUDIO'",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "DELETE FROM admin_settings WHERE key = 'CONTENT_STUDIO'",
    );
  }
}
