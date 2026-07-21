/**
 * PHASE 2 NOTE: same placeholder-now/PUB5-later situation as
 * customer.repository.js. Status/dispatch updates below are the one thing
 * that MUST stay writable in our own DB even after PUB5 read integration -
 * per the project rule "never modify PUB5 tables", dispatch/status changes
 * made from this portal should be tracked in OUR OWN Orders mirror/overlay,
 * not written back into PUB5 directly.
 */
const { sql, getPopPool } = require('../config/db');

async function list({ status, dispatchStatus, customerId, page = 1, pageSize = 20 }) {
  const pool = await getPopPool();
  const offset = (page - 1) * pageSize;

  const request = pool
    .request()
    .input('Status', sql.NVarChar(30), status || null)
    .input('DispatchStatus', sql.NVarChar(30), dispatchStatus || null)
    .input('CustomerId', sql.Int, customerId || null)
    .input('Offset', sql.Int, offset)
    .input('PageSize', sql.Int, pageSize);

  const result = await request.query(`
    SELECT o.OrderId, o.Pub5OrderNumber, o.InvoiceNumber, o.ChallanNumber, o.Amount,
           o.Status, o.DispatchStatus, o.OrderDate, c.CustomerId, c.Name AS CustomerName, c.Mobile,
           COUNT(*) OVER() AS TotalCount
    FROM dbo.Orders o
    INNER JOIN dbo.Customers c ON c.CustomerId = o.CustomerId
    WHERE (@Status IS NULL OR o.Status = @Status)
      AND (@DispatchStatus IS NULL OR o.DispatchStatus = @DispatchStatus)
      AND (@CustomerId IS NULL OR o.CustomerId = @CustomerId)
    ORDER BY o.OrderDate DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
  `);

  const totalCount = result.recordset[0]?.TotalCount || 0;
  return { rows: result.recordset, totalCount, page, pageSize };
}

async function findById(orderId) {
  const pool = await getPopPool();
  const orderResult = await pool
    .request()
    .input('OrderId', sql.Int, orderId)
    .query(`
      SELECT o.OrderId, o.Pub5OrderNumber, o.InvoiceNumber, o.ChallanNumber, o.Amount,
             o.Status, o.DispatchStatus, o.OrderDate,
             c.CustomerId, c.Name AS CustomerName, c.Mobile, c.Email
      FROM dbo.Orders o
      INNER JOIN dbo.Customers c ON c.CustomerId = o.CustomerId
      WHERE o.OrderId = @OrderId
    `);

  const order = orderResult.recordset[0];
  if (!order) return null;

  const itemsResult = await pool
    .request()
    .input('OrderId', sql.Int, orderId)
    .query(`
      SELECT oi.OrderItemId, b.BookId, b.Title, b.Author, b.Isbn, oi.Quantity, oi.UnitPrice, oi.LineTotal
      FROM dbo.OrderItems oi
      INNER JOIN dbo.Books b ON b.BookId = oi.BookId
      WHERE oi.OrderId = @OrderId
    `);

  const attachmentsResult = await pool
    .request()
    .input('OrderId', sql.Int, orderId)
    .query(`
      SELECT AttachmentId, FileType, FileName, MimeType, SizeBytes, CreatedAt
      FROM dbo.Attachments
      WHERE OrderId = @OrderId
    `);

  return { ...order, items: itemsResult.recordset, attachments: attachmentsResult.recordset };
}

async function updateStatus(orderId, { status, dispatchStatus }) {
  const pool = await getPopPool();
  await pool
    .request()
    .input('OrderId', sql.Int, orderId)
    .input('Status', sql.NVarChar(30), status || null)
    .input('DispatchStatus', sql.NVarChar(30), dispatchStatus || null)
    .query(`
      UPDATE dbo.Orders
      SET Status = COALESCE(@Status, Status),
          DispatchStatus = COALESCE(@DispatchStatus, DispatchStatus),
          UpdatedAt = SYSUTCDATETIME()
      WHERE OrderId = @OrderId
    `);
}

async function upsertFromImport({ customerId, invoiceNumber, pub5OrderNumber, challanNumber, amount, status, dispatchStatus, orderDate }) {
  const pool = await getPopPool();
  const request = pool.request()
    .input('CustomerId', sql.Int, customerId)
    .input('InvoiceNumber', sql.NVarChar(50), invoiceNumber || null)
    .input('Pub5OrderNumber', sql.NVarChar(50), pub5OrderNumber || null)
    .input('ChallanNumber', sql.NVarChar(50), challanNumber || null)
    .input('Amount', sql.Decimal(14, 2), amount || 0)
    .input('Status', sql.NVarChar(30), status || 'Pending')
    .input('DispatchStatus', sql.NVarChar(30), dispatchStatus || 'Pending')
    .input('OrderDate', sql.DateTime2, orderDate ? new Date(orderDate) : new Date());

  if (invoiceNumber) {
    const existing = await pool.request().input('InvoiceNumber', sql.NVarChar(50), invoiceNumber)
      .query(`SELECT OrderId FROM dbo.Orders WHERE InvoiceNumber = @InvoiceNumber`);
    if (existing.recordset[0]) {
      await request.input('OrderId', sql.Int, existing.recordset[0].OrderId).query(`
        UPDATE dbo.Orders SET CustomerId = @CustomerId, Pub5OrderNumber = @Pub5OrderNumber,
          ChallanNumber = @ChallanNumber, Amount = @Amount, Status = @Status,
          DispatchStatus = @DispatchStatus, OrderDate = @OrderDate, UpdatedAt = SYSUTCDATETIME()
        WHERE OrderId = @OrderId`);
      return 'updated';
    }
  }
  await request.query(`
    INSERT INTO dbo.Orders (CustomerId, InvoiceNumber, Pub5OrderNumber, ChallanNumber, Amount, Status, DispatchStatus, OrderDate)
    VALUES (@CustomerId, @InvoiceNumber, @Pub5OrderNumber, @ChallanNumber, @Amount, @Status, @DispatchStatus, @OrderDate)`);
  return 'inserted';
}

module.exports = { list, findById, updateStatus, upsertFromImport };
