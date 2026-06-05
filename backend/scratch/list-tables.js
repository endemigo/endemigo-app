const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://fatihkartal@localhost:5432/endemigo'
});

async function main() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('TABLES IN PUBLIC SCHEMA:', res.rows.map(r => r.table_name));
  } catch (err) {
    console.error('List tables failed:', err);
  } finally {
    await client.end();
  }
}

main();
