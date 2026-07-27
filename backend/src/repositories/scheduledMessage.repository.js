const { getPopPool } = require('../config/db');

async function create({ customerId, createdByUserId, messageType, content, attachmentId, invoiceReference, scheduledFor }) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`INSERT INTO "ScheduledMessages" ("CustomerId","CreatedByUserId","MessageType","Content","AttachmentId","InvoiceReference","ScheduledFor") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [customerId, createdByUserId, messageType, content || null, attachmentId || null, invoiceReference || null, scheduledFor]);
  return rows[0];
}
async function listUpcoming({ customerId, page = 1, pageSize = 50 } = {}) {
  const pool = await getPopPool();
  const offset = (page - 1) * pageSize;
  const { rows } = await pool.query(`SELECT sm.*, c."Name" AS "CustomerName", c."Mobile", u."FullName" AS "CreatedByName" FROM "ScheduledMessages" sm INNER JOIN "Customers" c ON c."CustomerId" = sm."CustomerId" INNER JOIN "Users" u ON u."UserId" = sm."CreatedByUserId" WHERE sm."Status" = 'Scheduled' AND ($1::int IS NULL OR sm."CustomerId" = $1) ORDER BY sm."ScheduledFor" ASC OFFSET $2 LIMIT $3`, [customerId || null, offset, pageSize]);
  return rows;
}
async function findDue(now = new Date()) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT sm.*, c."Mobile" AS "CustomerMobile", c."Name" AS "CustomerName" FROM "ScheduledMessages" sm INNER JOIN "Customers" c ON c."CustomerId" = sm."CustomerId" WHERE sm."Status" = 'Scheduled' AND sm."ScheduledFor" <= $1 ORDER BY sm."ScheduledFor" ASC`, [now]);
  return rows;
}
async function markStatus(scheduledMessageId, status, failReason = null) {
  const pool = await getPopPool();
  await pool.query(`UPDATE "ScheduledMessages" SET "Status" = $2, "FailReason" = $3 WHERE "ScheduledMessageId" = $1`, [scheduledMessageId, status, failReason]);
}
async function cancel(scheduledMessageId) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`UPDATE "ScheduledMessages" SET "Status" = 'Cancelled' WHERE "ScheduledMessageId" = $1 AND "Status" = 'Scheduled' RETURNING *`, [scheduledMessageId]);
  return rows[0] || null;
}
module.exports = { create, listUpcoming, findDue, markStatus, cancel };