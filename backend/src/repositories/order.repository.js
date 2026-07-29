const { getPopPool } = require('../config/db');
async function list({ status, dispatchStatus, customerId, page = 1, pageSize = 20 }) {
  const pool = await getPopPool();
  const offset = (page - 1) * pageSize;
  const { rows } = await pool.query(`SELECT o."OrderId", o."Pub5OrderNumber", o."InvoiceNumber", o."ChallanNumber", o."Amount", o."Status", o."DispatchStatus", o."OrderDate", c."CustomerId", c."Name" AS "CustomerName", c."Mobile", COUNT(*) OVER() AS "TotalCount" FROM "Orders" o INNER JOIN "Customers" c ON c."CustomerId" = o."CustomerId" WHERE ($1::text IS NULL OR o."Status" = $1) AND ($2::text IS NULL OR o."DispatchStatus" = $2) AND ($3::int IS NULL OR o."CustomerId" = $3) ORDER BY o."OrderDate" DESC OFFSET $4 LIMIT $5`, [status || null, dispatchStatus || null, customerId || null, offset, pageSize]);
  const totalCount = rows[0]?.TotalCount || 0;
  return { rows, totalCount: Number(totalCount), page, pageSize };
}
async function findById(orderId) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT o."OrderId", o."Pub5OrderNumber", o."InvoiceNumber", o."ChallanNumber", o."Amount", o."Status", o."DispatchStatus", o."OrderDate", c."CustomerId", c."Name" AS "CustomerName", c."Mobile", c."Email" FROM "Orders" o INNER JOIN "Customers" c ON c."CustomerId" = o."CustomerId" WHERE o."OrderId" = $1`, [orderId]);
  const order = rows[0];
  if (!order) return null;
  const items = await pool.query(`SELECT oi."OrderItemId", b."BookId", b."Title", b."Author", b."Isbn", oi."Quantity", oi."UnitPrice", oi."LineTotal" FROM "OrderItems" oi INNER JOIN "Books" b ON b."BookId" = oi."BookId" WHERE oi."OrderId" = $1`, [orderId]);
  const attachments = await pool.query(`SELECT "AttachmentId", "FileType", "FileName", "MimeType", "SizeBytes", "CreatedAt" FROM "Attachments" WHERE "OrderId" = $1`, [orderId]);
  return { ...order, items: items.rows, attachments: attachments.rows };
}
async function updateStatus(orderId, { status, dispatchStatus }) {
  const pool = await getPopPool();
  await pool.query(`UPDATE "Orders" SET "Status" = COALESCE($2, "Status"), "DispatchStatus" = COALESCE($3, "DispatchStatus"), "UpdatedAt" = NOW() WHERE "OrderId" = $1`, [orderId, status || null, dispatchStatus || null]);
}
async function upsertFromImport({ customerId, invoiceNumber, pub5OrderNumber, challanNumber, amount, status, dispatchStatus, orderDate }) {
  const pool = await getPopPool();
  const date = orderDate ? new Date(orderDate) : new Date();
  if (invoiceNumber) {
    const existing = await pool.query(`SELECT "OrderId" FROM "Orders" WHERE "InvoiceNumber" = $1`, [invoiceNumber]);
    if (existing.rows[0]) {
      await pool.query(`UPDATE "Orders" SET "CustomerId" = $2, "Pub5OrderNumber" = $3, "ChallanNumber" = $4, "Amount" = $5, "Status" = $6, "DispatchStatus" = $7, "OrderDate" = $8, "UpdatedAt" = NOW() WHERE "OrderId" = $1`, [existing.rows[0].OrderId, customerId, pub5OrderNumber || null, challanNumber || null, amount || 0, status || 'Pending', dispatchStatus || 'Pending', date]);
      return 'updated';
    }
  }
  await pool.query(`INSERT INTO "Orders" ("CustomerId", "InvoiceNumber", "Pub5OrderNumber", "ChallanNumber", "Amount", "Status", "DispatchStatus", "OrderDate") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [customerId, invoiceNumber || null, pub5OrderNumber || null, challanNumber || null, amount || 0, status || 'Pending', dispatchStatus || 'Pending', date]);
  return 'inserted';
}


async function create({ customerId, invoiceNumber, pub5OrderNumber, challanNumber, amount, status, dispatchStatus, orderDate }) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`
    INSERT INTO "Orders" ("CustomerId","InvoiceNumber","Pub5OrderNumber","ChallanNumber","Amount","Status","DispatchStatus","OrderDate")
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
  `, [customerId, invoiceNumber || null, pub5OrderNumber || null, challanNumber || null, amount || 0, status || 'Pending', dispatchStatus || 'Pending', orderDate ? new Date(orderDate) : new Date()]);
  return rows[0];
}
module.exports = { list, findById, updateStatus, upsertFromImport ,create };