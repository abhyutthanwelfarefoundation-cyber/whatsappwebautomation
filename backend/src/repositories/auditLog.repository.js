const { getPopPool } = require('../config/db');
async function record({ userId, eventType, entityType, entityId, ipAddress, userAgent, metadata }) {
  const pool = await getPopPool();
  await pool.query(`INSERT INTO "AuditLogs" ("UserId", "EventType", "EntityType", "EntityId", "IpAddress", "UserAgent", "Metadata") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId || null, eventType, entityType || null, entityId ? String(entityId) : null, ipAddress || null, userAgent || null, metadata ? JSON.stringify(metadata) : null]);
}
module.exports = { record };