const { getPopPool } = require('../config/db');
async function getStats() {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT (SELECT COUNT(*) FROM "Customers") AS "TotalCustomers", (SELECT COUNT(*) FROM "Orders") AS "TotalOrders", (SELECT COUNT(*) FROM "Orders" WHERE "OrderDate"::date = NOW()::date) AS "OrdersToday", (SELECT COUNT(*) FROM "Orders" WHERE "Status" = 'Pending') AS "PendingOrders", (SELECT COUNT(*) FROM "Orders" WHERE "DispatchStatus" = 'Pending') AS "PendingDispatch", (SELECT COUNT(*) FROM "Orders" WHERE "Status" = 'Pending' AND "InvoiceNumber" IS NULL) AS "PendingInvoice", (SELECT COALESCE(SUM("OutstandingBalance"), 0) FROM "Customers") AS "TotalOutstanding", (SELECT COUNT(*) FROM "Messages" WHERE "Direction" = 'Outgoing' AND "CreatedAt"::date = NOW()::date) AS "MessagesSentToday", (SELECT COUNT(*) FROM "Messages" WHERE "Direction" = 'Outgoing' AND "Status" = 'Delivered') AS "MessagesDelivered", (SELECT COUNT(*) FROM "Messages" WHERE "Direction" = 'Outgoing' AND "Status" = 'Read') AS "MessagesRead", (SELECT COUNT(*) FROM "Messages" WHERE "Direction" = 'Outgoing' AND "Status" = 'Failed') AS "MessagesFailed"`);
  return rows[0];
}
async function getRecentActivity(limit = 8) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT al."EventType", al."CreatedAt", u."FullName" FROM "AuditLogs" al LEFT JOIN "Users" u ON u."UserId" = al."UserId" ORDER BY al."CreatedAt" DESC LIMIT $1`, [limit]);
  return rows;
}
module.exports = { getStats, getRecentActivity };