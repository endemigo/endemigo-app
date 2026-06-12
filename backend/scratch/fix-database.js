const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://fatihkartal@localhost:5432/endemigo",
  });
  await client.connect();

  const values = [
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'RETURN_REJECTED',
    'RETURN_IN_TRANSIT',
    'RETURN_DELIVERED',
    'REFUND_PENDING',
    'REFUNDED'
  ];

  console.log("Altering orders_status_enum to add new values...");
  for (const val of values) {
    try {
      await client.query(`ALTER TYPE orders_status_enum ADD VALUE IF NOT EXISTS '${val}';`);
      console.log(`✅ Added ${val} to orders_status_enum`);
    } catch (err) {
      console.error(`❌ Failed to add ${val}:`, err.message);
    }
  }

  // Also check if order_audit_events_fromstatus_enum needs them
  console.log("\nAltering order_audit_events_fromstatus_enum...");
  for (const val of values) {
    try {
      await client.query(`ALTER TYPE order_audit_events_fromstatus_enum ADD VALUE IF NOT EXISTS '${val}';`);
      console.log(`✅ Added ${val} to order_audit_events_fromstatus_enum`);
    } catch (err) {
      console.error(`❌ Failed to add ${val}:`, err.message);
    }
  }

  // Also check if order_audit_events_tostatus_enum needs them
  console.log("\nAltering order_audit_events_tostatus_enum...");
  for (const val of values) {
    try {
      await client.query(`ALTER TYPE order_audit_events_tostatus_enum ADD VALUE IF NOT EXISTS '${val}';`);
      console.log(`✅ Added ${val} to order_audit_events_tostatus_enum`);
    } catch (err) {
      console.error(`❌ Failed to add ${val}:`, err.message);
    }
  }

  await client.end();
  console.log("\nDone!");
}

main().catch(console.error);
