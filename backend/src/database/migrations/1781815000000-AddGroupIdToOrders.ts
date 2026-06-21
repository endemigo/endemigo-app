import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGroupIdToOrders1781815000000 implements MigrationInterface {
    name = 'AddGroupIdToOrders1781815000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "groupId" varchar NULL`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_group_id" ON "orders" ("groupId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_group_id"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "groupId"`);
    }
}
