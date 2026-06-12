const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://fatihkartal@localhost:5432/endemigo",
  });
  await client.connect();

  const sellerId = '4c71e58d-8741-4028-9101-6dd0427066f3'; // Ahmet Aydin

  // Check enum values
  const enumValuesRes = await client.query(`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'orders_status_enum';
  `);
  console.log("Allowed enum values for orders_status_enum:", enumValuesRes.rows.map(r => r.enumlabel));

  const queries = {
    sellerProfile: `SELECT * FROM seller_profiles WHERE "userId" = '${sellerId}'`,
    newOrders: `SELECT count(*) FROM orders WHERE "sellerId" = '${sellerId}' AND status = 'ESCROW_HELD'`,
    preparingShipment: `SELECT count(*) FROM orders WHERE "sellerId" = '${sellerId}' AND status = 'PREPARING_SHIPMENT'`,
    inTransit: `SELECT count(*) FROM orders WHERE "sellerId" = '${sellerId}' AND status = 'IN_TRANSIT'`,
    delivered: `SELECT count(*) FROM orders WHERE "sellerId" = '${sellerId}' AND status = 'DELIVERED'`,
    returnRequested: `SELECT count(*) FROM orders WHERE "sellerId" = '${sellerId}' AND status = 'RETURN_REQUESTED'`,
    returnInTransit: `SELECT count(*) FROM orders WHERE "sellerId" = '${sellerId}' AND status = 'RETURN_IN_TRANSIT'`,
    refundedOrders: `SELECT count(*) FROM orders WHERE "sellerId" = '${sellerId}' AND status = 'REFUNDED'`,
    draftProducts: `SELECT count(*) FROM products WHERE "sellerId" = '${sellerId}' AND status = 'DRAFT'`,
    reviewProducts: `SELECT count(*) FROM products WHERE "sellerId" = '${sellerId}' AND status = 'PENDING_REVIEW'`,
    activeProducts: `SELECT count(*) FROM products WHERE "sellerId" = '${sellerId}' AND status = 'ACTIVE'`,
    outOfStockProducts: `SELECT count(*) FROM products WHERE "sellerId" = '${sellerId}' AND status = 'OUT_OF_STOCK'`,
    suspendedProducts: `SELECT count(*) FROM products WHERE "sellerId" = '${sellerId}' AND status = 'SUSPENDED'`,
    soldProducts: `SELECT count(*) FROM products WHERE "sellerId" = '${sellerId}' AND status = 'SOLD'`,
    lowStockProducts: `SELECT count(*) FROM products WHERE "sellerId" = '${sellerId}' AND status = 'ACTIVE' AND "stockQuantity" <= 3`,
    unreadNotifications: `SELECT count(*) FROM notifications WHERE "userId" = '${sellerId}' AND "readAt" IS NULL`,
    openNegotiations: `SELECT count(*) FROM negotiation_conversations WHERE "sellerId" = '${sellerId}' AND status = 'OPEN'`,
    wallet: `SELECT * FROM wallets WHERE "userId" = '${sellerId}'`,
    payoutRequests: `SELECT * FROM payout_requests WHERE "sellerId" = '${sellerId}'`,
    senderAddressCount: `SELECT count(*) FROM addresses WHERE "userId" = '${sellerId}' AND type = 'SENDER'`
  };

  for (const [name, sql] of Object.entries(queries)) {
    try {
      const res = await client.query(sql);
      console.log(`✅ Query "${name}" succeeded`);
    } catch (err) {
      console.error(`❌ Query "${name}" FAILED:`, err.message);
    }
  }

  await client.end();
}

main().catch(console.error);
