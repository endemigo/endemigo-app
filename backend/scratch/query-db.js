const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://fatihkartal@localhost:5432/endemigo",
  });
  await client.connect();
  const res = await client.query('SELECT id, email, "isSeller", "firstName", "lastName" FROM users;');
  console.log("Users:", res.rows);
  const profiles = await client.query('SELECT * FROM seller_profiles;');
  console.log("Profiles:", profiles.rows);
  await client.end();
}

main().catch(console.error);
