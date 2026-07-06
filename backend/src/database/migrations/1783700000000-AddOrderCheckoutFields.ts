import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderCheckoutFields1783700000000 implements MigrationInterface {
    name = 'AddOrderCheckoutFields1783700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Checkout akışı: teslimat adresi bağlantısı + anlık adres kopyası,
        // SKU bazlı stok düşümü ve çift stok iadesini önleyen damga.
        await queryRunner.query(`ALTER TABLE "orders" ADD "productVariantSkuId" uuid`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "shippingAddressId" uuid`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "shippingAddressSnapshot" jsonb`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "stockRestoredAt" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "stockRestoredAt"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "shippingAddressSnapshot"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "shippingAddressId"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "productVariantSkuId"`);
    }
}
