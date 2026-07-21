const userRepo = require('../repositories/user.repository');
const refreshTokenRepo = require('../repositories/refreshToken.repository');
const passwordResetRepo = require('../repositories/passwordResetToken.repository');
const auditLogRepo = require('../repositories/auditLog.repository');
const emailService = require('./email.service');
const ApiError = require('../utils/ApiError');
const { hashPassword, comparePassword, isPasswordStrongEnough } = require('../utils/password');
const {
  signAccessToken,
  generateRefreshTokenValue,
  generatePasswordResetTokenValue,
  hashToken,
} = require('../utils/tokenUtils');
const { env } = require('../config/env');
const logger = require('../config/logger');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function login({ email, password, rememberMe, ip, userAgent }) {
  const user = await userRepo.findByEmail(email);

  // Deliberately identical error for "no such user" and "wrong password"
  // so login doesn't leak which emails exist in the system.
  const invalidCredentialsError = ApiError.unauthorized('Invalid email or password');

  if (!user || !user.IsActive) {
    throw invalidCredentialsError;
  }

  if (user.LockedUntil && new Date(user.LockedUntil) > new Date()) {
    throw ApiError.forbidden(
      `Account temporarily locked due to repeated failed logins. Try again after ${new Date(
        user.LockedUntil
      ).toLocaleTimeString()}.`
    );
  }

  const passwordMatches = await comparePassword(password, user.PasswordHash);
  if (!passwordMatches) {
    const attempts = user.FailedLoginAttempts + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;
    await userRepo.incrementFailedLoginAttempts(user.UserId, lockedUntil);
    await auditLogRepo.record({
      userId: user.UserId,
      eventType: 'LOGIN_FAILED',
      ipAddress: ip,
      userAgent,
    });
    throw invalidCredentialsError;
  }

  await userRepo.resetFailedLoginAttempts(user.UserId);

  const permissions = await userRepo.getPermissionsForRole(user.RoleId);
  const accessToken = signAccessToken({ ...user, Permissions: permissions });

  const refreshTokenValue = generateRefreshTokenValue();
  const refreshTokenHash = hashToken(refreshTokenValue);
  const expiryDays = rememberMe
    ? env.jwt.refreshExpiryDaysRememberMe
    : env.jwt.refreshExpiryDays;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  await refreshTokenRepo.create({
    userId: user.UserId,
    tokenHash: refreshTokenHash,
    expiresAt,
    rememberMe,
    createdByIp: ip,
  });

  await auditLogRepo.record({
    userId: user.UserId,
    eventType: 'LOGIN',
    ipAddress: ip,
    userAgent,
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    refreshTokenExpiresAt: expiresAt,
    user: {
      userId: user.UserId,
      fullName: user.FullName,
      email: user.Email,
      role: user.RoleName,
      permissions,
      mustChangePassword: user.MustChangePassword,
    },
  };
}

async function refresh({ refreshToken, ip }) {
  if (!refreshToken) throw ApiError.unauthorized('No refresh token provided');

  const tokenHash = hashToken(refreshToken);
  const stored = await refreshTokenRepo.findValidByHash(tokenHash);

  if (!stored || stored.RevokedAt || new Date(stored.ExpiresAt) < new Date()) {
    throw ApiError.unauthorized('Refresh token invalid or expired, please log in again');
  }

  const user = await userRepo.findById(stored.UserId);
  if (!user || !user.IsActive) {
    throw ApiError.unauthorized('User account no longer active');
  }

  const permissions = await userRepo.getPermissionsForRole(user.RoleId);
  const accessToken = signAccessToken({ ...user, Permissions: permissions });

  // Rotate refresh token: revoke old, issue new.
  const newRefreshTokenValue = generateRefreshTokenValue();
  const newRefreshTokenHash = hashToken(newRefreshTokenValue);
  const expiryDays = stored.RememberMe
    ? env.jwt.refreshExpiryDaysRememberMe
    : env.jwt.refreshExpiryDays;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  await refreshTokenRepo.revokeByHash(tokenHash, newRefreshTokenHash);
  await refreshTokenRepo.create({
    userId: user.UserId,
    tokenHash: newRefreshTokenHash,
    expiresAt,
    rememberMe: stored.RememberMe,
    createdByIp: ip,
  });

  return {
    accessToken,
    refreshToken: newRefreshTokenValue,
    refreshTokenExpiresAt: expiresAt,
    user: {
      userId: user.UserId,
      fullName: user.FullName,
      email: user.Email,
      role: user.RoleName,
      permissions,
    },
  };
}

async function logout({ refreshToken, userId, ip, userAgent }) {
  if (refreshToken) {
    await refreshTokenRepo.revokeByHash(hashToken(refreshToken));
  }
  await auditLogRepo.record({ userId, eventType: 'LOGOUT', ipAddress: ip, userAgent });
}

async function forgotPassword({ email }) {
  const user = await userRepo.findByEmail(email);

  // Always respond success-shaped regardless of whether the email exists,
  // to avoid leaking which emails are registered. Actual email is only
  // sent if the user exists.
  if (!user || !user.IsActive) {
    logger.info('Password reset requested for unknown/inactive email', { email });
    return;
  }

  const resetTokenValue = generatePasswordResetTokenValue();
  const resetTokenHash = hashToken(resetTokenValue);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await passwordResetRepo.create({ userId: user.UserId, tokenHash: resetTokenHash, expiresAt });

  const resetLink = `${env.clientUrl}/reset-password?token=${resetTokenValue}&uid=${user.UserId}`;
  await emailService.sendPasswordResetEmail(user.Email, resetLink);
}

async function resetPassword({ userId, token, newPassword }) {
  if (!isPasswordStrongEnough(newPassword)) {
    throw ApiError.badRequest('Password must be at least 8 characters and include a letter and a number');
  }

  const tokenHash = hashToken(token);
  const stored = await passwordResetRepo.findValidByHash(tokenHash);

  if (
    !stored ||
    stored.UsedAt ||
    stored.UserId !== Number(userId) ||
    new Date(stored.ExpiresAt) < new Date()
  ) {
    throw ApiError.badRequest('Reset link is invalid or has expired');
  }

  const passwordHash = await hashPassword(newPassword);
  await userRepo.updatePassword(stored.UserId, passwordHash);
  await passwordResetRepo.markUsed(stored.TokenId);

  // Revoking all sessions on password reset is a deliberate security choice:
  // a stolen refresh token becomes useless the moment the password changes.
  await refreshTokenRepo.revokeAllForUser(stored.UserId);

  await auditLogRepo.record({ userId: stored.UserId, eventType: 'PASSWORD_RESET' });
}

async function changePassword({ userId, currentPassword, newPassword }) {
  if (!isPasswordStrongEnough(newPassword)) {
    throw ApiError.badRequest('Password must be at least 8 characters and include a letter and a number');
  }

  const user = await userRepo.findByIdWithPasswordHash(userId);
  if (!user) throw ApiError.notFound('User not found');

  const currentMatches = await comparePassword(currentPassword, user.PasswordHash);
  if (!currentMatches) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  const passwordHash = await hashPassword(newPassword);
  await userRepo.updatePassword(userId, passwordHash);

  await auditLogRepo.record({ userId, eventType: 'PASSWORD_CHANGED' });
}

module.exports = { login, refresh, logout, forgotPassword, resetPassword, changePassword };

