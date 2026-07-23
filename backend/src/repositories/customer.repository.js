const { getPopPool } = require('../config/db');
async function search({ query, page = 1, pageSize = 20 }) {
  const pool = await getPopPool();
  const offset = (page - 1) * pageSize;
  const q = `%${query || ''}%`;
  const { rows } = await pool.query(`SELECT c."CustomerId", c."Name", c."Mobile", c."Email", c."City", c."State", c."OutstandingBalance", COUNT(*) OVER() AS "TotalCount" FROM "Customers" c WHERE ($1 = '%%' OR c."Name" ILIKE $1 OR c."Mobile" ILIKE $1 OR c."Email" ILIKE $1 OR CAST(c."CustomerId" AS TEXT) ILIKE $1 OR EXISTS (SELECT 1 FROM "Orders" o WHERE o."CustomerId" = c."CustomerId" AND (o."InvoiceNumber" ILIKE $1 OR o."Pub5OrderNumber" ILIKE $1 OR o."ChallanNumber" ILIKE $1))) ORDER BY c."Name" OFFSET $2 LIMIT $3`, [q, offset, pageSize]);
  const totalCount = rows[0]?.TotalCount || 0;
  return { rows, totalCount: Number(totalCount), page, pageSize };
}
async function findById(customerId) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT "CustomerId", "Pub5CustomerCode", "Name", "Mobile", "AltMobile", "Email", "Address", "City", "State", "OutstandingBalance", "CreatedAt", "UpdatedAt" FROM "Customers" WHERE "CustomerId" = $1`, [customerId]);
  return rows[0] || null;
}
async function findByMobile(mobile) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT "CustomerId", "Name" FROM "Customers" WHERE "Mobile" = $1`, [mobile]);
  return rows[0] || null;
}
async function getOrderHistory(customerId) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT "OrderId", "Pub5OrderNumber", "InvoiceNumber", "ChallanNumber", "Amount", "Status", "DispatchStatus", "OrderDate" FROM "Orders" WHERE "CustomerId" = $1 ORDER BY "OrderDate" DESC`, [customerId]);
  return rows;
}
async function getBooksPurchased(customerId) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT b."BookId", b."Title", b."Author", b."Isbn", SUM(oi."Quantity") AS "TotalQuantity", SUM(oi."LineTotal") AS "TotalSpent" FROM "OrderItems" oi INNER JOIN "Orders" o ON o."OrderId" = oi."OrderId" INNER JOIN "Books" b ON b."BookId" = oi."BookId" WHERE o."CustomerId" = $1 GROUP BY b."BookId", b."Title", b."Author", b."Isbn" ORDER BY "TotalQuantity" DESC`, [customerId]);
  return rows;
}
async function getWhatsAppHistory(customerId, limit = 50) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT m."MessageId", m."Direction", m."MessageType", m."Content", m."Status", m."CreatedAt", a."FileName" FROM "Messages" m LEFT JOIN "Attachments" a ON a."AttachmentId" = m."AttachmentId" WHERE m."CustomerId" = $1 ORDER BY m."CreatedAt" DESC LIMIT $2`, [customerId, limit]);
  return rows;
}
async function upsertByMobile({ name, mobile, altMobile, email, address, city, state, outstandingBalance, pub5CustomerCode }) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`INSERT INTO "Customers" ("Name", "Mobile", "AltMobile", "Email", "Address", "City", "State", "OutstandingBalance", "Pub5CustomerCode") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT ("Mobile") DO UPDATE SET "Name" = $1, "AltMobile" = COALESCE($3, "Customers"."AltMobile"), "Email" = COALESCE($4, "Customers"."Email"), "Address" = COALESCE($5, "Customers"."Address"), "City" = COALESCE($6, "Customers"."City"), "State" = COALESCE($7, "Customers"."State"), "OutstandingBalance" = $8, "Pub5CustomerCode" = COALESCE($9, "Customers"."Pub5CustomerCode"), "UpdatedAt" = NOW() RETURNING "CustomerId", (xmax = 0) AS inserted`, [name, mobile, altMobile || null, email || null, address || null, city || null, state || null, outstandingBalance || 0, pub5CustomerCode || null]);
  const row = rows[0];
  return { action: row.inserted ? 'inserted' : 'updated', customerId: row.CustomerId };
}
module.exports = { search, findById, findByMobile, getOrderHistory, getBooksPurchased, getWhatsAppHistory, upsertByMobile };