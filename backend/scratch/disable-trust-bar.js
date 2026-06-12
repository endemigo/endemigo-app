const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://fatihkartal@localhost:5432/endemigo'
  });
  
  await client.connect();
  
  try {
    const res = await client.query('SELECT * FROM mobile_config_documents');
    console.log(`Found ${res.rows.length} documents`);
    
    for (const row of res.rows) {
      console.log('Updating document ID:', row.id);
      
      const draft = row.draft;
      const published = row.published;
      
      if (draft && Array.isArray(draft.otherSurfaces)) {
        draft.otherSurfaces.forEach(s => {
          if (s.id === 'home-trust-bar') {
            s.enabled = false;
          }
        });
      }
      
      if (published && Array.isArray(published.otherSurfaces)) {
        published.otherSurfaces.forEach(s => {
          if (s.id === 'home-trust-bar') {
            s.enabled = false;
          }
        });
      }
      
      const updateRes = await client.query(
        'UPDATE mobile_config_documents SET draft = $1, published = $2, version = version + 1 WHERE id = $3 RETURNING version',
        [JSON.stringify(draft), JSON.stringify(published), row.id]
      );
      
      console.log('Update successful. New version:', updateRes.rows[0].version);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
