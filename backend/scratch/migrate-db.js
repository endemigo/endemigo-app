const { Client } = require('pg');

async function main() {
  const connectionString = 'postgresql://fatihkartal@localhost:5432/endemigo';
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    const res = await client.query('SELECT id, document FROM content_studio_documents');
    console.log(`Found ${res.rows.length} documents to migrate.`);
    
    for (const row of res.rows) {
      const doc = row.document;
      if (doc && doc.collections) {
        for (const colKey of Object.keys(doc.collections)) {
          const list = doc.collections[colKey];
          if (Array.isArray(list)) {
            doc.collections[colKey] = list.map(item => {
              if (item) {
                // If it has metadata.readTime, extract it
                let readTime = '';
                if (item.metadata && typeof item.metadata === 'object' && typeof item.metadata.readTime === 'string') {
                  readTime = item.metadata.readTime;
                }
                
                // Delete fields
                delete item.category;
                delete item.subtitle;
                delete item.route;
                delete item.metadata;
                
                // Add readTime
                item.readTime = readTime;
              }
              return item;
            });
            console.log(`Migrated ${colKey} array in document ${row.id}`);
          }
        }
      }
      
      // Update back in DB
      await client.query('UPDATE content_studio_documents SET document = $1, "updatedAt" = now() WHERE id = $2', [JSON.stringify(doc), row.id]);
      console.log(`Successfully updated document ${row.id} in DB.`);
    }
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

main();
