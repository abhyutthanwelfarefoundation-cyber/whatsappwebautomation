const { sql, getPopPool } = require('../config/db');

async function record({ userId, eventType, entityType, entityId, ipAddress, userAgent, metadata }) {
  const pool = await getPopPool();
  await pool
    .request()
    .input('UserId', sql.Int, userId || null)
    .input('EventType', sql.NVarChar(50), eventType)
    .input('EntityType', sql.NVarChar(50), entityType || null)
    .input('EntityId', sql.NVarChar(50), entityId ? String(entityId) : null)
    .input('IpAddress', sql.NVarChar(64), ipAddress || null)
    .input('UserAgent', sql.NVarChar(300), userAgent || null)
    .input('Metadata', sql.NVarChar(sql.MAX), metadata ? JSON.stringify(metadata) : null)
    .query(`
      INSERT INTO dbo.AuditLogs (UserId, EventType, EntityType, EntityId, IpAddress, UserAgent, Metadata)
      VALUES (@UserId, @EventType, @EntityType, @EntityId, @IpAddress, @UserAgent, @Metadata)
    `);
}

module.exports = { record };
