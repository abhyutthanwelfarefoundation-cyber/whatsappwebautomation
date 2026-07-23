const { getPopPool } = require('../config/db');
async function findByEmail(email) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT u."UserId", u."FullName", u."Email", u."Mobile", u."PasswordHash", u."RoleId", u."DepartmentId", u."IsActive", u."MustChangePassword", u."FailedLoginAttempts", u."LockedUntil", r."Name" AS "RoleName" FROM "Users" u INNER JOIN "Roles" r ON r."RoleId" = u."RoleId" WHERE u."Email" = $1`, [email]);
  return rows[0] || null;
}
async function findById(userId) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT u."UserId", u."FullName", u."Email", u."Mobile", u."RoleId", u."DepartmentId", u."IsActive", u."MustChangePassword", r."Name" AS "RoleName" FROM "Users" u INNER JOIN "Roles" r ON r."RoleId" = u."RoleId" WHERE u."UserId" = $1`, [userId]);
  return rows[0] || null;
}
async function findByIdWithPasswordHash(userId) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT "UserId", "PasswordHash" FROM "Users" WHERE "UserId" = $1`, [userId]);
  return rows[0] || null;
}
async function getPermissionsForRole(roleId) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT p."Code" FROM "RolePermissions" rp INNER JOIN "Permissions" p ON p."PermissionId" = rp."PermissionId" WHERE rp."RoleId" = $1`, [roleId]);
  return rows.map((r) => r.Code);
}
async function incrementFailedLoginAttempts(userId, lockedUntil) {
  const pool = await getPopPool();
  await pool.query(`UPDATE "Users" SET "FailedLoginAttempts" = "FailedLoginAttempts" + 1, "LockedUntil" = $2, "UpdatedAt" = NOW() WHERE "UserId" = $1`, [userId, lockedUntil || null]);
}
async function resetFailedLoginAttempts(userId) {
  const pool = await getPopPool();
  await pool.query(`UPDATE "Users" SET "FailedLoginAttempts" = 0, "LockedUntil" = NULL, "LastLoginAt" = NOW(), "UpdatedAt" = NOW() WHERE "UserId" = $1`, [userId]);
}
async function updatePassword(userId, passwordHash) {
  const pool = await getPopPool();
  await pool.query(`UPDATE "Users" SET "PasswordHash" = $2, "MustChangePassword" = false, "UpdatedAt" = NOW() WHERE "UserId" = $1`, [userId, passwordHash]);
}
module.exports = { findByEmail, findById, findByIdWithPasswordHash, getPermissionsForRole, incrementFailedLoginAttempts, resetFailedLoginAttempts, updatePassword };