const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://fatihkartal@localhost:5432/endemigo'
});

async function main() {
  await client.connect();
  try {
    const res = await client.query('SELECT * FROM admin_users;');
    console.log('ADMIN_USERS ROWS:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Database query failed:', err);
  } finally {
    await client.end();
  }
}

main();
