import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductImageUploadLimitsAdminSetting1748400000000
  implements MigrationInterface
{
  name = 'AddProductImageUploadLimitsAdminSetting1748400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TYPE admin_setting_key ADD VALUE IF NOT EXISTS 'PRODUCT_IMAGE_UPLOAD_LIMITS'",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "DELETE FROM admin_settings WHERE key = 'PRODUCT_IMAGE_UPLOAD_LIMITS'",
    );
  }
}
