import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveMetadataAndAddReadTime1780092000000
  implements MigrationInterface
{
  name = 'RemoveMetadataAndAddReadTime1780092000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query('SELECT id, document FROM content_studio_documents');
    for (const row of rows) {
      const doc = row.document;
      if (doc && doc.collections) {
        for (const colKey of Object.keys(doc.collections)) {
          const list = doc.collections[colKey];
          if (Array.isArray(list)) {
            doc.collections[colKey] = list.map((item: any) => {
              if (item) {
                let readTime = '';
                if (item.metadata && typeof item.metadata === 'object' && typeof item.metadata.readTime === 'string') {
                  readTime = item.metadata.readTime;
                }
                delete item.category;
                delete item.subtitle;
                delete item.route;
                delete item.metadata;
                item.readTime = readTime;
              }
              return item;
            });
          }
        }
      }
      await queryRunner.query(
        'UPDATE content_studio_documents SET document = $1, "updatedAt" = now() WHERE id = $2',
        [JSON.stringify(doc), row.id]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query('SELECT id, document FROM content_studio_documents');
    for (const row of rows) {
      const doc = row.document;
      if (doc && doc.collections) {
        for (const colKey of Object.keys(doc.collections)) {
          const list = doc.collections[colKey];
          if (Array.isArray(list)) {
            doc.collections[colKey] = list.map((item: any) => {
              if (item) {
                const metadata: any = {};
                if (item.readTime) {
                  metadata.readTime = item.readTime;
                }
                item.metadata = metadata;
                delete item.readTime;
              }
              return item;
            });
          }
        }
      }
      await queryRunner.query(
        'UPDATE content_studio_documents SET document = $1, "updatedAt" = now() WHERE id = $2',
        [JSON.stringify(doc), row.id]
      );
    }
  }
}
