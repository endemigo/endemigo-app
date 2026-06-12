const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://fatihkartal@localhost:5432/endemigo'
  });
  
  await client.connect();
  
  try {
    const res = await client.query(`
      SELECT * FROM auctions
      WHERE "createdAt" > NOW() - INTERVAL '2 hours'
      ORDER BY "createdAt" DESC;
    `);
    console.log('Auctions created in the last 2 hours:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
