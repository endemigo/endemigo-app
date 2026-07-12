import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReturnImagesToOrders1781543679243 implements MigrationInterface {
  name = 'AddReturnImagesToOrders1781543679243';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "returnImages" jsonb NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "returnImages"`,
    );
  }
}
