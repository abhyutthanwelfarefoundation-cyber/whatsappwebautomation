const { sql, getPopPool } = require('../config/db');

async function create({ userId, tokenHash, expiresAt, rememberMe, createdByIp }) {
  const pool = await getPopPool();
  await pool
    .request()
    .input('UserId', sql.Int, userId)
    .input('TokenHash', sql.NVarChar(255), tokenHash)
    .input('ExpiresAt', sql.DateTime2, expiresAt)
    .input('RememberMe', sql.Bit, rememberMe ? 1 : 0)
    .input('CreatedByIp', sql.NVarChar(64), createdByIp || null)
    .query(`
      INSERT INTO dbo.RefreshTokens (UserId, TokenHash, ExpiresAt, RememberMe, CreatedByIp)
      VALUES (@UserId, @TokenHash, @ExpiresAt, @RememberMe, @CreatedByIp)
    `);
}

async function findValidByHash(tokenHash) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('TokenHash', sql.NVarChar(255), tokenHash)
    .query(`
      SELECT TokenId, UserId, ExpiresAt, RevokedAt, RememberMe
      FROM dbo.RefreshTokens
      WHERE TokenHash = @TokenHash
    `);
  return result.recordset[0] || null;
}

async function revokeByHash(tokenHash, replacedByTokenHash = null) {
  const pool = await getPopPool();
  await pool
    .request()
    .input('TokenHash', sql.NVarChar(255), tokenHash)
    .input('ReplacedByToken', sql.NVarChar(255), replacedByTokenHash)
    .query(`
      UPDATE dbo.RefreshTokens
      SET RevokedAt = SYSUTCDATETIME(), ReplacedByToken = @ReplacedByToken
      WHERE TokenHash = @TokenHash
    `);
}

async function revokeAllForUser(userId) {
  const pool = await getPopPool();
  await pool
    .request()
    .input('UserId', sql.Int, userId)
    .query(`
      UPDATE dbo.RefreshTokens
      SET RevokedAt = SYSUTCDATETIME()
      WHERE UserId = @UserId AND RevokedAt IS NULL
    `);
}

module.exports = { create, findValidByHash, revokeByHash, revokeAllForUser };
