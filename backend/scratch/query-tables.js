const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://fatihkartal@localhost:5432/endemigo'
  });
  
  await client.connect();
  
  try {
    console.log('--- TABLES ---');
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public'
    `);
    console.log(tablesRes.rows.map(r => r.table_name));

    console.log('\n--- CATEGORIES ---');
    const catRes = await client.query('SELECT id, name, slug FROM categories LIMIT 5');
    console.log(catRes.rows);

    console.log('\n--- PRODUCTS ---');
    const prodRes = await client.query('SELECT id, title FROM products LIMIT 5');
    console.log(prodRes.rows);

    console.log('\n--- AUCTIONS ---');
    const aucRes = await client.query('SELECT id, title FROM auction_events LIMIT 5');
    console.log(aucRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
