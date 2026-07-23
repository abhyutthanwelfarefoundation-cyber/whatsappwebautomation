const { getPopPool } = require('../config/db');
async function create({ userId, tokenHash, expiresAt }) {
  const pool = await getPopPool();
  await pool.query(`INSERT INTO "PasswordResetTokens" ("UserId", "TokenHash", "ExpiresAt") VALUES ($1, $2, $3)`, [userId, tokenHash, expiresAt]);
}
async function findValidByHash(tokenHash) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT "TokenId", "UserId", "ExpiresAt", "UsedAt" FROM "PasswordResetTokens" WHERE "TokenHash" = $1`, [tokenHash]);
  return rows[0] || null;
}
async function markUsed(tokenId) {
  const pool = await getPopPool();
  await pool.query(`UPDATE "PasswordResetTokens" SET "UsedAt" = NOW() WHERE "TokenId" = $1`, [tokenId]);
}
module.exports = { create, findValidByHash, markUsed };