import { MigrationInterface, QueryRunner } from 'typeorm';

export class SellerProfilesStatusDefaultPending1783400000000 implements MigrationInterface {
  name = 'SellerProfilesStatusDefaultPending1783400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Entity default'u PENDING; eski synchronize kalıntısı DB default'u APPROVED idi.
    // Raw SQL insert'lerin onaysız APPROVED satıcı doğurmasını engeller.
    await queryRunner.query(
      `ALTER TABLE "seller_profiles" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "seller_profiles" ALTER COLUMN "status" SET DEFAULT 'APPROVED'`,
    );
  }
}
