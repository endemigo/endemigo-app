import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAbsenteeBidStatus1783300000000 implements MigrationInterface {
  name = 'AddAbsenteeBidStatus1783300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "bids_status_enum" ADD VALUE IF NOT EXISTS 'ABSENTEE'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres enum değerleri güvenli şekilde kaldırılamaz; no-op.
  }
}
