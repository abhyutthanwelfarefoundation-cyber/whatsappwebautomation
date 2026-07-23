const { getPopPool } = require('../config/db');
async function create({ userId, tokenHash, expiresAt, rememberMe, createdByIp }) {
  const pool = await getPopPool();
  await pool.query(`INSERT INTO "RefreshTokens" ("UserId", "TokenHash", "ExpiresAt", "RememberMe", "CreatedByIp") VALUES ($1, $2, $3, $4, $5)`, [userId, tokenHash, expiresAt, !!rememberMe, createdByIp || null]);
}
async function findValidByHash(tokenHash) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT "TokenId", "UserId", "ExpiresAt", "RevokedAt", "RememberMe" FROM "RefreshTokens" WHERE "TokenHash" = $1`, [tokenHash]);
  return rows[0] || null;
}
async function revokeByHash(tokenHash, replacedByTokenHash = null) {
  const pool = await getPopPool();
  await pool.query(`UPDATE "RefreshTokens" SET "RevokedAt" = NOW(), "ReplacedByToken" = $2 WHERE "TokenHash" = $1`, [tokenHash, replacedByTokenHash]);
}
async function revokeAllForUser(userId) {
  const pool = await getPopPool();
  await pool.query(`UPDATE "RefreshTokens" SET "RevokedAt" = NOW() WHERE "UserId" = $1 AND "RevokedAt" IS NULL`, [userId]);
}
module.exports = { create, findValidByHash, revokeByHash, revokeAllForUser };