const { sql, getPopPool } = require('../config/db');

/**
 * Conversation list = one row per customer who has at least one message,
 * showing the most recent message and an unread count (incoming messages
 * not yet marked read by staff). Ordered by most recent activity.
 */
async function listConversations({ search, page = 1, pageSize = 30 }) {
  const pool = await getPopPool();
  const offset = (page - 1) * pageSize;

  const result = await pool
    .request()
    .input('Search', sql.NVarChar(200), search ? `%${search}%` : null)
    .input('Offset', sql.Int, offset)
    .input('PageSize', sql.Int, pageSize).query(`
      WITH LastMessage AS (
        SELECT m.*, ROW_NUMBER() OVER (PARTITION BY m.CustomerId ORDER BY m.CreatedAt DESC) AS rn
        FROM dbo.Messages m
        WHERE m.IsDeleted = 0
      )
      SELECT c.CustomerId, c.Name, c.Mobile,
             lm.Content AS LastMessageContent, lm.MessageType AS LastMessageType,
             lm.Direction AS LastMessageDirection, lm.CreatedAt AS LastMessageAt,
             lm.Status AS LastMessageStatus,
             (SELECT COUNT(*) FROM dbo.Messages um
              WHERE um.CustomerId = c.CustomerId AND um.Direction = 'Incoming' AND um.Status <> 'Read' AND um.IsDeleted = 0) AS UnreadCount,
             COUNT(*) OVER() AS TotalCount
      FROM dbo.Customers c
      INNER JOIN LastMessage lm ON lm.CustomerId = c.CustomerId AND lm.rn = 1
      WHERE (@Search IS NULL OR c.Name LIKE @Search OR c.Mobile LIKE @Search)
      ORDER BY lm.CreatedAt DESC
      OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
    `);

  const totalCount = result.recordset[0]?.TotalCount || 0;
  return { rows: result.recordset, totalCount, page, pageSize };
}

async function getThread(customerId, { before, limit = 50 } = {}) {
  const pool = await getPopPool();
  const request = pool
    .request()
    .input('CustomerId', sql.Int, customerId)
    .input('Limit', sql.Int, limit)
    .input('Before', sql.DateTime2, before || null);

  const result = await request.query(`
    SELECT TOP (@Limit) m.MessageId, m.Direction, m.MessageType, m.Content, m.Status,
           m.FailReason, m.WhatsAppMessageId, m.CreatedAt, m.SentByUserId, u.FullName AS SentByName,
           a.AttachmentId, a.FileName, a.FileType, a.MimeType
    FROM dbo.Messages m
    LEFT JOIN dbo.Users u ON u.UserId = m.SentByUserId
    LEFT JOIN dbo.Attachments a ON a.AttachmentId = m.AttachmentId
    WHERE m.CustomerId = @CustomerId
      AND m.IsDeleted = 0
      AND (@Before IS NULL OR m.CreatedAt < @Before)
    ORDER BY m.CreatedAt DESC
  `);

  return result.recordset.reverse(); // return oldest-first for a chat thread
}

async function create({
  customerId,
  sentByUserId,
  direction,
  messageType,
  content,
  attachmentId,
  whatsAppMessageId,
  status,
}) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('CustomerId', sql.Int, customerId)
    .input('SentByUserId', sql.Int, sentByUserId || null)
    .input('Direction', sql.NVarChar(10), direction)
    .input('MessageType', sql.NVarChar(20), messageType)
    .input('Content', sql.NVarChar(sql.MAX), content || null)
    .input('AttachmentId', sql.BigInt, attachmentId || null)
    .input('WhatsAppMessageId', sql.NVarChar(150), whatsAppMessageId || null)
    .input('Status', sql.NVarChar(20), status || 'Pending').query(`
      INSERT INTO dbo.Messages
        (CustomerId, SentByUserId, Direction, MessageType, Content, AttachmentId, WhatsAppMessageId, Status)
      OUTPUT INSERTED.*
      VALUES
        (@CustomerId, @SentByUserId, @Direction, @MessageType, @Content, @AttachmentId, @WhatsAppMessageId, @Status)
    `);
  return result.recordset[0];
}

async function updateStatusByWhatsAppId(whatsAppMessageId, status, failReason = null) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('WhatsAppMessageId', sql.NVarChar(150), whatsAppMessageId)
    .input('Status', sql.NVarChar(20), status)
    .input('FailReason', sql.NVarChar(500), failReason).query(`
      UPDATE dbo.Messages
      SET Status = @Status, FailReason = @FailReason, UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.MessageId, INSERTED.CustomerId, INSERTED.Status
      WHERE WhatsAppMessageId = @WhatsAppMessageId
    `);
  return result.recordset[0] || null;
}

async function markThreadRead(customerId) {
  const pool = await getPopPool();
  await pool
    .request()
    .input('CustomerId', sql.Int, customerId)
    .query(`
      UPDATE dbo.Messages
      SET Status = 'Read', UpdatedAt = SYSUTCDATETIME()
      WHERE CustomerId = @CustomerId AND Direction = 'Incoming' AND Status <> 'Read'
    `);
}

async function findById(messageId) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('MessageId', sql.BigInt, messageId)
    .query(`
      SELECT m.MessageId, m.CustomerId, m.SentByUserId, m.Direction, m.MessageType,
             m.Content, m.Status, m.AttachmentId, m.IsDeleted,
             c.Mobile AS CustomerMobile
      FROM dbo.Messages m
      INNER JOIN dbo.Customers c ON c.CustomerId = m.CustomerId
      WHERE m.MessageId = @MessageId
    `);
  return result.recordset[0] || null;
}

/**
 * Soft-delete only ("delete for me" style) - WhatsApp Business API has no
 * facility to recall a message already delivered to the customer's phone,
 * so this just hides it from our own chat view going forward. The message
 * stays in the DB (IsDeleted = 1) for audit purposes.
 */
async function softDelete(messageId, deletedByUserId) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('MessageId', sql.BigInt, messageId)
    .input('DeletedByUserId', sql.Int, deletedByUserId).query(`
      UPDATE dbo.Messages
      SET IsDeleted = 1, DeletedAt = SYSUTCDATETIME(), DeletedByUserId = @DeletedByUserId, UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.MessageId, INSERTED.CustomerId
      WHERE MessageId = @MessageId
    `);
  return result.recordset[0] || null;
}

/** Resets a failed message back to Pending before a retry attempt re-sends it. */
async function resetForRetry(messageId) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('MessageId', sql.BigInt, messageId).query(`
      UPDATE dbo.Messages
      SET Status = 'Pending', FailReason = NULL, UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE MessageId = @MessageId
    `);
  return result.recordset[0] || null;
}

/** Look up a customer by WhatsApp mobile number - used for incoming webhook messages. */
async function findCustomerByMobile(mobile) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('Mobile', sql.NVarChar(20), mobile)
    .query(`SELECT CustomerId, Name, Mobile FROM dbo.Customers WHERE Mobile = @Mobile`);
  return result.recordset[0] || null;
}

async function createCustomerFromWhatsApp(mobile, displayName) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('Mobile', sql.NVarChar(20), mobile)
    .input('Name', sql.NVarChar(150), displayName || mobile).query(`
      INSERT INTO dbo.Customers (Name, Mobile)
      OUTPUT INSERTED.CustomerId, INSERTED.Name, INSERTED.Mobile
      VALUES (@Name, @Mobile)
    `);
  return result.recordset[0];
}

module.exports = {
  listConversations,
  getThread,
  create,
  updateStatusByWhatsAppId,
  markThreadRead,
  findCustomerByMobile,
  createCustomerFromWhatsApp,
  findById,
  softDelete,
  resetForRetry,
};