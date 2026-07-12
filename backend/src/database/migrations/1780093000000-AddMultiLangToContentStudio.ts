import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiLangToContentStudio1780093000000 implements MigrationInterface {
  name = 'AddMultiLangToContentStudio1780093000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(
      'SELECT id, document FROM content_studio_documents',
    );
    for (const row of rows) {
      const doc = row.document;
      if (doc && doc.collections) {
        for (const colKey of Object.keys(doc.collections)) {
          const list = doc.collections[colKey];
          if (Array.isArray(list)) {
            doc.collections[colKey] = list.map((item: any) => {
              if (item) {
                if (item.titleEn === undefined) item.titleEn = '';
                if (item.bodyEn === undefined) item.bodyEn = '';
                if (item.excerptEn === undefined) item.excerptEn = '';
                if (item.readTimeEn === undefined) item.readTimeEn = '';
              }
              return item;
            });
          }
        }
      }
      await queryRunner.query(
        'UPDATE content_studio_documents SET document = $1, "updatedAt" = now() WHERE id = $2',
        [JSON.stringify(doc), row.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(
      'SELECT id, document FROM content_studio_documents',
    );
    for (const row of rows) {
      const doc = row.document;
      if (doc && doc.collections) {
        for (const colKey of Object.keys(doc.collections)) {
          const list = doc.collections[colKey];
          if (Array.isArray(list)) {
            doc.collections[colKey] = list.map((item: any) => {
              if (item) {
                delete item.titleEn;
                delete item.bodyEn;
                delete item.excerptEn;
                delete item.readTimeEn;
              }
              return item;
            });
          }
        }
      }
      await queryRunner.query(
        'UPDATE content_studio_documents SET document = $1, "updatedAt" = now() WHERE id = $2',
        [JSON.stringify(doc), row.id],
      );
    }
  }
}
