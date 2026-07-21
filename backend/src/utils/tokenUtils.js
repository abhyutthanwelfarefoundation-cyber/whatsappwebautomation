const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { env } = require('../config/env');

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.UserId,
      role: user.RoleName,
      permissions: user.Permissions || [],
    },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiry }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

/**
 * Refresh tokens are opaque random strings (not JWTs) so they can be
 * revoked/rotated server-side by looking up their hash in RefreshTokens.
 */
function generateRefreshTokenValue() {
  return crypto.randomBytes(48).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generatePasswordResetTokenValue() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshTokenValue,
  generatePasswordResetTokenValue,
  hashToken,
};
