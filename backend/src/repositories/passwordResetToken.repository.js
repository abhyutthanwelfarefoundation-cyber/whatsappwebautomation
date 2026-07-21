const { sql, getPopPool } = require('../config/db');

async function create({ userId, tokenHash, expiresAt }) {
  const pool = await getPopPool();
  await pool
    .request()
    .input('UserId', sql.Int, userId)
    .input('TokenHash', sql.NVarChar(255), tokenHash)
    .input('ExpiresAt', sql.DateTime2, expiresAt)
    .query(`
      INSERT INTO dbo.PasswordResetTokens (UserId, TokenHash, ExpiresAt)
      VALUES (@UserId, @TokenHash, @ExpiresAt)
    `);
}

async function findValidByHash(tokenHash) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('TokenHash', sql.NVarChar(255), tokenHash)
    .query(`
      SELECT TokenId, UserId, ExpiresAt, UsedAt
      FROM dbo.PasswordResetTokens
      WHERE TokenHash = @TokenHash
    `);
  return result.recordset[0] || null;
}

async function markUsed(tokenId) {
  const pool = await getPopPool();
  await pool
    .request()
    .input('TokenId', sql.BigInt, tokenId)
    .query(`
      UPDATE dbo.PasswordResetTokens
      SET UsedAt = SYSUTCDATETIME()
      WHERE TokenId = @TokenId
    `);
}

module.exports = { create, findValidByHash, markUsed };
