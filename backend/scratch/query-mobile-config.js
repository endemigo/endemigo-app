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
      console.log('ID:', row.id);
      console.log('Version:', row.version);
      console.log('Draft surfaces length:', row.draft?.otherSurfaces?.length);
      console.log('Published surfaces length:', row.published?.otherSurfaces?.length);
      
      if (row.draft?.otherSurfaces) {
        console.log('Draft surfaces:');
        console.log(row.draft.otherSurfaces.map(s => ({ id: s.id, order: s.order })));
      }
      if (row.published?.otherSurfaces) {
        console.log('Published surfaces:');
        console.log(row.published.otherSurfaces.map(s => ({ id: s.id, order: s.order })));
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
