const { sql, getPopPool } = require('../config/db');

async function getStats() {
  const pool = await getPopPool();
  const result = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.Customers) AS TotalCustomers,
      (SELECT COUNT(*) FROM dbo.Orders) AS TotalOrders,
      (SELECT COUNT(*) FROM dbo.Orders WHERE CAST(OrderDate AS DATE) = CAST(SYSUTCDATETIME() AS DATE)) AS OrdersToday,
      (SELECT COUNT(*) FROM dbo.Orders WHERE Status = 'Pending') AS PendingOrders,
      (SELECT COUNT(*) FROM dbo.Orders WHERE DispatchStatus = 'Pending') AS PendingDispatch,
      (SELECT COUNT(*) FROM dbo.Orders WHERE Status = 'Pending' AND InvoiceNumber IS NULL) AS PendingInvoice,
      (SELECT ISNULL(SUM(OutstandingBalance), 0) FROM dbo.Customers) AS TotalOutstanding,
      (SELECT COUNT(*) FROM dbo.Messages WHERE Direction = 'Outgoing' AND CAST(CreatedAt AS DATE) = CAST(SYSUTCDATETIME() AS DATE)) AS MessagesSentToday,
      (SELECT COUNT(*) FROM dbo.Messages WHERE Direction = 'Outgoing' AND Status = 'Delivered') AS MessagesDelivered,
      (SELECT COUNT(*) FROM dbo.Messages WHERE Direction = 'Outgoing' AND Status = 'Read') AS MessagesRead,
      (SELECT COUNT(*) FROM dbo.Messages WHERE Direction = 'Outgoing' AND Status = 'Failed') AS MessagesFailed
  `);
  return result.recordset[0];
}

async function getRecentActivity(limit = 8) {
  const pool = await getPopPool();
  const result = await pool.request().input('Limit', sql.Int, limit).query(`
    SELECT TOP (@Limit) al.EventType, al.CreatedAt, u.FullName
    FROM dbo.AuditLogs al
    LEFT JOIN dbo.Users u ON u.UserId = al.UserId
    ORDER BY al.CreatedAt DESC
  `);
  return result.recordset;
}

module.exports = { getStats, getRecentActivity };