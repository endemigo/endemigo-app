import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class Phase12UserPublicProfileColumns1746401000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasBio = await queryRunner.hasColumn('users', 'bio');
    if (!hasBio) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'bio',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    const hasLocation = await queryRunner.hasColumn('users', 'location');
    if (!hasLocation) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'location',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    const hasBannerUrl = await queryRunner.hasColumn('users', 'bannerUrl');
    if (!hasBannerUrl) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'bannerUrl',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasBannerUrl = await queryRunner.hasColumn('users', 'bannerUrl');
    if (hasBannerUrl) {
      await queryRunner.dropColumn('users', 'bannerUrl');
    }

    const hasLocation = await queryRunner.hasColumn('users', 'location');
    if (hasLocation) {
      await queryRunner.dropColumn('users', 'location');
    }

    const hasBio = await queryRunner.hasColumn('users', 'bio');
    if (hasBio) {
      await queryRunner.dropColumn('users', 'bio');
    }
  }
}
