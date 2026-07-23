const { getPopPool } = require('../config/db');
async function listConversations({ search, page = 1, pageSize = 30 }) {
  const pool = await getPopPool();
  const offset = (page - 1) * pageSize;
  const s = search ? `%${search}%` : null;
  const { rows } = await pool.query(`WITH "LastMessage" AS (SELECT m.*, ROW_NUMBER() OVER (PARTITION BY m."CustomerId" ORDER BY m."CreatedAt" DESC) AS rn FROM "Messages" m WHERE m."IsDeleted" = false) SELECT c."CustomerId", c."Name", c."Mobile", lm."Content" AS "LastMessageContent", lm."MessageType" AS "LastMessageType", lm."Direction" AS "LastMessageDirection", lm."CreatedAt" AS "LastMessageAt", lm."Status" AS "LastMessageStatus", (SELECT COUNT(*) FROM "Messages" um WHERE um."CustomerId" = c."CustomerId" AND um."Direction" = 'Incoming' AND um."Status" <> 'Read' AND um."IsDeleted" = false) AS "UnreadCount", COUNT(*) OVER() AS "TotalCount" FROM "Customers" c INNER JOIN "LastMessage" lm ON lm."CustomerId" = c."CustomerId" AND lm.rn = 1 WHERE ($1::text IS NULL OR c."Name" ILIKE $1 OR c."Mobile" ILIKE $1) ORDER BY lm."CreatedAt" DESC OFFSET $2 LIMIT $3`, [s, offset, pageSize]);
  const totalCount = rows[0]?.TotalCount || 0;
  return { rows, totalCount: Number(totalCount), page, pageSize };
}
async function getThread(customerId, { before, limit = 50 } = {}) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT m."MessageId", m."Direction", m."MessageType", m."Content", m."Status", m."FailReason", m."WhatsAppMessageId", m."CreatedAt", m."SentByUserId", u."FullName" AS "SentByName", a."AttachmentId", a."FileName", a."FileType", a."MimeType" FROM "Messages" m LEFT JOIN "Users" u ON u."UserId" = m."SentByUserId" LEFT JOIN "Attachments" a ON a."AttachmentId" = m."AttachmentId" WHERE m."CustomerId" = $1 AND m."IsDeleted" = false AND ($2::timestamp IS NULL OR m."CreatedAt" < $2) ORDER BY m."CreatedAt" DESC LIMIT $3`, [customerId, before || null, limit]);
  return rows.reverse();
}
async function create({ customerId, sentByUserId, direction, messageType, content, attachmentId, whatsAppMessageId, status }) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`INSERT INTO "Messages" ("CustomerId", "SentByUserId", "Direction", "MessageType", "Content", "AttachmentId", "WhatsAppMessageId", "Status") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [customerId, sentByUserId || null, direction, messageType, content || null, attachmentId || null, whatsAppMessageId || null, status || 'Pending']);
  return rows[0];
}
async function updateStatusByWhatsAppId(whatsAppMessageId, status, failReason = null) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`UPDATE "Messages" SET "Status" = $2, "FailReason" = $3, "UpdatedAt" = NOW() WHERE "WhatsAppMessageId" = $1 RETURNING "MessageId", "CustomerId", "Status"`, [whatsAppMessageId, status, failReason]);
  return rows[0] || null;
}
async function markThreadRead(customerId) {
  const pool = await getPopPool();
  await pool.query(`UPDATE "Messages" SET "Status" = 'Read', "UpdatedAt" = NOW() WHERE "CustomerId" = $1 AND "Direction" = 'Incoming' AND "Status" <> 'Read'`, [customerId]);
}
async function findById(messageId) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT m."MessageId", m."CustomerId", m."SentByUserId", m."Direction", m."MessageType", m."Content", m."Status", m."AttachmentId", m."IsDeleted", c."Mobile" AS "CustomerMobile" FROM "Messages" m INNER JOIN "Customers" c ON c."CustomerId" = m."CustomerId" WHERE m."MessageId" = $1`, [messageId]);
  return rows[0] || null;
}
async function softDelete(messageId, deletedByUserId) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`UPDATE "Messages" SET "IsDeleted" = true, "DeletedAt" = NOW(), "DeletedByUserId" = $2, "UpdatedAt" = NOW() WHERE "MessageId" = $1 RETURNING "MessageId", "CustomerId"`, [messageId, deletedByUserId]);
  return rows[0] || null;
}
async function resetForRetry(messageId) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`UPDATE "Messages" SET "Status" = 'Pending', "FailReason" = NULL, "UpdatedAt" = NOW() WHERE "MessageId" = $1 RETURNING *`, [messageId]);
  return rows[0] || null;
}
async function findCustomerByMobile(mobile) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT "CustomerId", "Name", "Mobile" FROM "Customers" WHERE "Mobile" = $1`, [mobile]);
  return rows[0] || null;
}
async function createCustomerFromWhatsApp(mobile, displayName) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`INSERT INTO "Customers" ("Name", "Mobile") VALUES ($1, $2) RETURNING "CustomerId", "Name", "Mobile"`, [displayName || mobile, mobile]);
  return rows[0];
}
module.exports = { listConversations, getThread, create, updateStatusByWhatsAppId, markThreadRead, findCustomerByMobile, createCustomerFromWhatsApp, findById, softDelete, resetForRetry };