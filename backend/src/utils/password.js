const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

async function hashPassword(plainText) {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

async function comparePassword(plainText, hash) {
  return bcrypt.compare(plainText, hash);
}

/**
 * Minimum password policy: 8+ chars, at least one letter and one number.
 * Kept simple and explicit rather than a hidden regex the user can't reason about.
 */
function isPasswordStrongEnough(password) {
  if (typeof password !== 'string' || password.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}

module.exports = { hashPassword, comparePassword, isPasswordStrongEnough };
