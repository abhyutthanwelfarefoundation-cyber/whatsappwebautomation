/**
 * PHASE 2 NOTE: These queries currently run against this app's own
 * PublisherOperations database (dbo.Customers), which holds a realistic
 * placeholder dataset. When real PUB5 read access is available, only the
 * `pool` used here needs to change (getPopPool -> getPub5Pool) plus the
 * column names in each SELECT to match PUB5's actual schema. Nothing in
 * the service/controller/route/frontend layers needs to change.
 */
const { sql, getPopPool } = require('../config/db');

async function search({ query, page = 1, pageSize = 20 }) {
  const pool = await getPopPool();
  const offset = (page - 1) * pageSize;

  const request = pool
    .request()
    .input('Query', sql.NVarChar(200), `%${query || ''}%`)
    .input('Offset', sql.Int, offset)
    .input('PageSize', sql.Int, pageSize);

  const result = await request.query(`
    SELECT c.CustomerId, c.Name, c.Mobile, c.Email, c.City, c.State, c.OutstandingBalance,
           COUNT(*) OVER() AS TotalCount
    FROM dbo.Customers c
    WHERE (@Query = '%%' OR
           c.Name LIKE @Query OR
           c.Mobile LIKE @Query OR
           c.Email LIKE @Query OR
           CAST(c.CustomerId AS NVARCHAR(20)) LIKE @Query OR
           EXISTS (
             SELECT 1 FROM dbo.Orders o
             WHERE o.CustomerId = c.CustomerId
               AND (o.InvoiceNumber LIKE @Query OR o.Pub5OrderNumber LIKE @Query OR o.ChallanNumber LIKE @Query)
           ))
    ORDER BY c.Name
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
  `);

  const totalCount = result.recordset[0]?.TotalCount || 0;
  return { rows: result.recordset, totalCount, page, pageSize };
}

async function findById(customerId) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('CustomerId', sql.Int, customerId)
    .query(`
      SELECT CustomerId, Pub5CustomerCode, Name, Mobile, AltMobile, Email, Address,
             City, State, OutstandingBalance, CreatedAt, UpdatedAt
      FROM dbo.Customers
      WHERE CustomerId = @CustomerId
    `);
  return result.recordset[0] || null;
}

async function getOrderHistory(customerId) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('CustomerId', sql.Int, customerId)
    .query(`
      SELECT OrderId, Pub5OrderNumber, InvoiceNumber, ChallanNumber, Amount,
             Status, DispatchStatus, OrderDate
      FROM dbo.Orders
      WHERE CustomerId = @CustomerId
      ORDER BY OrderDate DESC
    `);
  return result.recordset;
}

async function getBooksPurchased(customerId) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('CustomerId', sql.Int, customerId)
    .query(`
      SELECT b.BookId, b.Title, b.Author, b.Isbn,
             SUM(oi.Quantity) AS TotalQuantity,
             SUM(oi.LineTotal) AS TotalSpent
      FROM dbo.OrderItems oi
      INNER JOIN dbo.Orders o ON o.OrderId = oi.OrderId
      INNER JOIN dbo.Books b ON b.BookId = oi.BookId
      WHERE o.CustomerId = @CustomerId
      GROUP BY b.BookId, b.Title, b.Author, b.Isbn
      ORDER BY TotalQuantity DESC
    `);
  return result.recordset;
}

async function getWhatsAppHistory(customerId, limit = 50) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('CustomerId', sql.Int, customerId)
    .input('Limit', sql.Int, limit)
    .query(`
      SELECT TOP (@Limit) m.MessageId, m.Direction, m.MessageType, m.Content, m.Status, m.CreatedAt,
             a.FileName
      FROM dbo.Messages m
      LEFT JOIN dbo.Attachments a ON a.AttachmentId = m.AttachmentId
      WHERE m.CustomerId = @CustomerId
      ORDER BY m.CreatedAt DESC
    `);
  return result.recordset;
}

async function upsertByMobile({ name, mobile, altMobile, email, address, city, state, outstandingBalance, pub5CustomerCode }) {
  const pool = await getPopPool();
  const request = pool.request()
    .input('Name', sql.NVarChar(150), name)
    .input('Mobile', sql.NVarChar(20), mobile)
    .input('AltMobile', sql.NVarChar(20), altMobile || null)
    .input('Email', sql.NVarChar(150), email || null)
    .input('Address', sql.NVarChar(500), address || null)
    .input('City', sql.NVarChar(100), city || null)
    .input('State', sql.NVarChar(100), state || null)
    .input('OutstandingBalance', sql.Decimal(14, 2), outstandingBalance || 0)
    .input('Pub5CustomerCode', sql.NVarChar(50), pub5CustomerCode || null);

  const result = await request.query(`
    MERGE dbo.Customers AS target
    USING (SELECT @Mobile AS Mobile) AS source
    ON target.Mobile = source.Mobile
    WHEN MATCHED THEN
      UPDATE SET Name = @Name, AltMobile = COALESCE(@AltMobile, target.AltMobile),
        Email = COALESCE(@Email, target.Email), Address = COALESCE(@Address, target.Address),
        City = COALESCE(@City, target.City), State = COALESCE(@State, target.State),
        OutstandingBalance = @OutstandingBalance,
        Pub5CustomerCode = COALESCE(@Pub5CustomerCode, target.Pub5CustomerCode), UpdatedAt = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
      INSERT (Name, Mobile, AltMobile, Email, Address, City, State, OutstandingBalance, Pub5CustomerCode)
      VALUES (@Name, @Mobile, @AltMobile, @Email, @Address, @City, @State, @OutstandingBalance, @Pub5CustomerCode)
    OUTPUT $action AS Action, INSERTED.CustomerId;
  `);
  const row = result.recordset[0];
  return { action: row.Action === 'INSERT' ? 'inserted' : 'updated', customerId: row.CustomerId };
}

async function findByMobile(mobile) {
  const pool = await getPopPool();
  const result = await pool.request().input('Mobile', sql.NVarChar(20), mobile)
    .query(`SELECT CustomerId, Name FROM dbo.Customers WHERE Mobile = @Mobile`);
  return result.recordset[0] || null;
}

module.exports = { search, findById, getOrderHistory, getBooksPurchased, getWhatsAppHistory, upsertByMobile , findByMobile};


