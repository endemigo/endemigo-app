const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://fatihkartal@localhost:5432/endemigo'
});

const targetIds = [
  "35e7c0ea-a191-4064-96f9-87fe4a1f39ae","752e4d47-5730-4951-9acf-6ab1947a3dcc",
  "94e0157a-5b63-49bb-b06d-71b8252701ac","4c3684ef-5d2f-45ce-b6af-8547e6f593d8",
  "dd581770-0e63-4d98-84ff-c24b42768acd","fc3baea0-1598-4f72-9074-8f11eb6d1360",
  "d5c412f3-a722-4bf9-bec8-5e78b65015bb","f3961cd2-a49e-42e7-9165-33f4214e7ce7",
  "f0994a1a-03b6-4747-b454-b9bf89efc4c9","eed3a041-f2e1-49b0-b624-97110d3faff8",
  "257f383d-d4d1-437b-81bd-adce3bcb1e32","1f40ff3f-2e02-42be-8c3d-317647c34b41",
  "ca1aa793-38a4-473b-9805-491ca9e710db","84f50e12-9763-45bb-9906-c2f4ee95cac9",
  "203e4259-7e1f-4448-8dcf-4d03568875ac","786bbbb3-0a70-45a1-bdea-c9d13b719a2c",
  "2358fd16-faa5-43d6-9091-45348f956754","68b68e39-b6c6-4875-ba4e-c64bb04217b7",
  "9def1048-f928-434e-b81c-3110fb83bf77","e125ac1e-bcf5-4c5c-b56c-a65c8c7fe7c5",
  "66759bdf-2d36-4b6e-91b7-1bfa846dc90a","fff5eb98-cf21-4d5d-a2d2-29117a5bc8ee"
];

async function main() {
  await client.connect();
  try {
    const res = await client.query(
      'SELECT id, "nameTr", kind, status FROM variant_numbers WHERE id = ANY($1);',
      [targetIds]
    );
    console.log(`Found ${res.rows.length} of ${targetIds.length} IDs:`);
    res.rows.forEach(r => {
      console.log(`- ${r.id}: ${r.nameTr} (${r.kind}) [${r.status}]`);
    });
    
    // Find IDs that were not found in variant_numbers
    const foundIds = new Set(res.rows.map(r => r.id));
    const missingIds = targetIds.filter(id => !foundIds.has(id));
    console.log('Missing IDs in variant_numbers table:', missingIds);
    
  } catch (err) {
    console.error('Database query failed:', err);
  } finally {
    await client.end();
  }
}

main();
