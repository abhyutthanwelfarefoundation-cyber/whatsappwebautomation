const db = require('../config/db'); // adjust to your actual pg Pool export

/**
 * ADJUST TABLE/COLUMN NAMES to match your actual schema if different.
 * Assumed columns on "messages" table:
 *   id, customer_id, wa_message_id, direction, type, content,
 *   status, sent_at, delivered_at, read_at, fail_reason, created_at
 *
 * Assumed columns on "customers" table:
 *   id, mobile, name, ...
 */

async function findCustomerByMobile(mobile) {
  // Normalize: strip any leading '+' or spaces, keep digits only,
  // adjust to match however your customers.mobile is stored.
  const normalized = mobile.replace(/\D/g, '');

  const result = await db.query(
    `SELECT * FROM customers WHERE mobile = $1 LIMIT 1`,
    [normalized]
  );

  return result.rows[0] || null;
}

async function insertIncomingMessage({ customerId, waMessageId, type, content, sentAt }) {
  const result = await db.query(
    `INSERT INTO messages
      (customer_id, wa_message_id, direction, type, content, status, sent_at, created_at)
     VALUES ($1, $2, 'inbound', $3, $4, 'received', $5, NOW())
     RETURNING *`,
    [customerId, waMessageId, type, content, sentAt]
  );

  return result.rows[0];
}

async function updateStatusByWaMessageId(waMessageId, { status, deliveredAt, readAt, failReason }) {
  const result = await db.query(
    `UPDATE messages
     SET status = $1,
         delivered_at = COALESCE($2, delivered_at),
         read_at = COALESCE($3, read_at),
         fail_reason = COALESCE($4, fail_reason)
     WHERE wa_message_id = $5
     RETURNING *`,
    [status, deliveredAt || null, readAt || null, failReason || null, waMessageId]
  );

  return result.rows[0] || null;
}

module.exports = {
  findCustomerByMobile,
  insertIncomingMessage,
  updateStatusByWaMessageId,
};