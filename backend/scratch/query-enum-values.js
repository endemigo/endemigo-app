const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://fatihkartal@localhost:5432/endemigo'
  });
  
  await client.connect();
  
  try {
    const res = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = 'products_status_enum'::regtype;
    `);
    console.log('Database enum values for products_status_enum:');
    console.log(res.rows.map(r => r.enumlabel));
  } catch (err) {
    console.error('Failed to query enum:', err);
  } finally {
    await client.end();
  }
}

main();
