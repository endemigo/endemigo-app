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
      
      // Update draft config
      if (draft && Array.isArray(draft.otherSurfaces)) {
        draft.otherSurfaces.forEach(s => {
          if (s.id === 'home-recently-viewed') {
            s.order = 30;
          } else if (s.id === 'home-listings') {
            s.order = 31;
          } else if (s.id === 'home-categories') {
            s.order = 32;
          }
        });
        // Sort draft otherSurfaces by order
        draft.otherSurfaces.sort((a, b) => a.order - b.order);
      }
      
      // Update published config
      if (published && Array.isArray(published.otherSurfaces)) {
        published.otherSurfaces.forEach(s => {
          if (s.id === 'home-recently-viewed') {
            s.order = 30;
          } else if (s.id === 'home-listings') {
            s.order = 31;
          } else if (s.id === 'home-categories') {
            s.order = 32;
          }
        });
        // Sort published otherSurfaces by order
        published.otherSurfaces.sort((a, b) => a.order - b.order);
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
