const { Client } = require('pg');

async function main() {
  const connectionString = 'postgresql://fatihkartal@localhost:5432/endemigo';
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    const res = await client.query('SELECT id, document FROM content_studio_documents LIMIT 5');
    console.log('Found documents:', res.rows.length);
    for (const row of res.rows) {
      console.log('ID:', row.id);
      console.log('Document structure keys:', Object.keys(row.document));
      if (row.document.collections) {
        const collections = row.document.collections;
        const colKeys = Object.keys(collections);
        console.log('Collections keys:', colKeys);
        for (const colKey of colKeys) {
          const list = collections[colKey];
          if (Array.isArray(list)) {
            console.log(`- ${colKey}: ${list.length} items`);
            if (list.length > 0) {
              console.log(`  Sample ${colKey} item keys:`, Object.keys(list[0]));
              console.log(`  Sample values (category, subtitle, route):`, {
                category: list[0].category,
                subtitle: list[0].subtitle,
                route: list[0].route
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await client.end();
  }
}

main();
