const { sql, getPopPool } = require('../config/db');

async function findByEmail(email) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('Email', sql.NVarChar(150), email)
    .query(`
      SELECT u.UserId, u.FullName, u.Email, u.Mobile, u.PasswordHash, u.RoleId,
             u.DepartmentId, u.IsActive, u.MustChangePassword, u.FailedLoginAttempts,
             u.LockedUntil, r.Name AS RoleName
      FROM dbo.Users u
      INNER JOIN dbo.Roles r ON r.RoleId = u.RoleId
      WHERE u.Email = @Email
    `);
  return result.recordset[0] || null;
}

async function findById(userId) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('UserId', sql.Int, userId)
    .query(`
      SELECT u.UserId, u.FullName, u.Email, u.Mobile, u.RoleId, u.DepartmentId,
             u.IsActive, u.MustChangePassword, r.Name AS RoleName
      FROM dbo.Users u
      INNER JOIN dbo.Roles r ON r.RoleId = u.RoleId
      WHERE u.UserId = @UserId
    `);
  return result.recordset[0] || null;
}

async function getPermissionsForRole(roleId) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('RoleId', sql.Int, roleId)
    .query(`
      SELECT p.Code
      FROM dbo.RolePermissions rp
      INNER JOIN dbo.Permissions p ON p.PermissionId = rp.PermissionId
      WHERE rp.RoleId = @RoleId
    `);
  return result.recordset.map((r) => r.Code);
}

async function incrementFailedLoginAttempts(userId, lockedUntil) {
  const pool = await getPopPool();
  await pool
    .request()
    .input('UserId', sql.Int, userId)
    .input('LockedUntil', sql.DateTime2, lockedUntil || null)
    .query(`
      UPDATE dbo.Users
      SET FailedLoginAttempts = FailedLoginAttempts + 1,
          LockedUntil = @LockedUntil,
          UpdatedAt = SYSUTCDATETIME()
      WHERE UserId = @UserId
    `);
}

async function resetFailedLoginAttempts(userId) {
  const pool = await getPopPool();
  await pool
    .request()
    .input('UserId', sql.Int, userId)
    .query(`
      UPDATE dbo.Users
      SET FailedLoginAttempts = 0,
          LockedUntil = NULL,
          LastLoginAt = SYSUTCDATETIME(),
          UpdatedAt = SYSUTCDATETIME()
      WHERE UserId = @UserId
    `);
}

async function findByIdWithPasswordHash(userId) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('UserId', sql.Int, userId)
    .query(`
      SELECT UserId, PasswordHash
      FROM dbo.Users
      WHERE UserId = @UserId
    `);
  return result.recordset[0] || null;
}

async function updatePassword(userId, passwordHash) {
  const pool = await getPopPool();
  await pool
    .request()
    .input('UserId', sql.Int, userId)
    .input('PasswordHash', sql.NVarChar(255), passwordHash)
    .query(`
      UPDATE dbo.Users
      SET PasswordHash = @PasswordHash,
          MustChangePassword = 0,
          UpdatedAt = SYSUTCDATETIME()
      WHERE UserId = @UserId
    `);
}

module.exports = {
  findByEmail,
  findById,
  findByIdWithPasswordHash,
  getPermissionsForRole,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,
  updatePassword,
};