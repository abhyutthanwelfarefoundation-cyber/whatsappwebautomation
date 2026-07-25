const { getPopPool } = require('../config/db');
async function getStats() {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT (SELECT COUNT(*) FROM "Customers") AS "TotalCustomers", (SELECT COUNT(*) FROM "Orders") AS "TotalOrders", (SELECT COUNT(*) FROM "Orders" WHERE "OrderDate"::date = NOW()::date) AS "OrdersToday", (SELECT COUNT(*) FROM "Orders" WHERE "Status" = 'Pending') AS "PendingOrders", (SELECT COUNT(*) FROM "Orders" WHERE "DispatchStatus" = 'Pending') AS "PendingDispatch", (SELECT COUNT(*) FROM "Orders" WHERE "Status" = 'Pending' AND "InvoiceNumber" IS NULL) AS "PendingInvoice", (SELECT COALESCE(SUM("OutstandingBalance"), 0) FROM "Customers") AS "TotalOutstanding", (SELECT COUNT(*) FROM "Messages" WHERE "Direction" = 'Outgoing' AND "CreatedAt"::date = NOW()::date) AS "MessagesSentToday", (SELECT COUNT(*) FROM "Messages" WHERE "Direction" = 'Outgoing' AND "Status" = 'Delivered') AS "MessagesDelivered", (SELECT COUNT(*) FROM "Messages" WHERE "Direction" = 'Outgoing' AND "Status" = 'Read') AS "MessagesRead", (SELECT COUNT(*) FROM "Messages" WHERE "Direction" = 'Outgoing' AND "Status" = 'Failed') AS "MessagesFailed", (SELECT COUNT(DISTINCT a."OrderId") FROM "Messages" m INNER JOIN "Attachments" a ON a."AttachmentId" = m."AttachmentId" WHERE m."MessageType" = 'Template' AND a."OrderId" IS NOT NULL AND m."Status" <> 'Failed') AS "InvoicesSentCount"`);
  return rows[0];
}
async function getRecentActivity(limit = 8) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT al."EventType", al."CreatedAt", u."FullName" FROM "AuditLogs" al LEFT JOIN "Users" u ON u."UserId" = al."UserId" ORDER BY al."CreatedAt" DESC LIMIT $1`, [limit]);
  return rows;
}


async function getInvoicesSentList(limit = 100) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`
    SELECT DISTINCT ON (a."OrderId") a."OrderId", o."InvoiceNumber", o."Pub5OrderNumber",
           c."Name" AS "CustomerName", c."Mobile", m."CreatedAt" AS "SentAt", m."Status" AS "DeliveryStatus"
    FROM "Messages" m
    INNER JOIN "Attachments" a ON a."AttachmentId" = m."AttachmentId"
    INNER JOIN "Orders" o ON o."OrderId" = a."OrderId"
    INNER JOIN "Customers" c ON c."CustomerId" = o."CustomerId"
    WHERE m."MessageType" = 'Template'
    ORDER BY a."OrderId", m."CreatedAt" DESC
    LIMIT $1
  `, [limit]);
  return rows;
}

module.exports = { getStats, getRecentActivity, getInvoicesSentList };