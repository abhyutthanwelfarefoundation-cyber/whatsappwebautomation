const authService = require('../services/auth.service');
const userRepo = require('../repositories/user.repository');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { env } = require('../config/env');

const REFRESH_COOKIE_NAME = 'pop_refresh_token';

function setRefreshCookie(res, token, expiresAt) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    expires: expiresAt,
    path: '/api/auth',
  });
}

const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const result = await authService.login({
    email,
    password,
    rememberMe,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);

  return new ApiResponse(200, {
    accessToken: result.accessToken,
    user: result.user,
  }, 'Login successful').send(res);
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME] || req.body.refreshToken;
  const result = await authService.refresh({ refreshToken, ip: req.ip });

  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);

  return new ApiResponse(200, {
    accessToken: result.accessToken,
    user: result.user,
  }, 'Token refreshed').send(res);
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
  await authService.logout({
    refreshToken,
    userId: req.user ? req.user.userId : null,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  return new ApiResponse(200, null, 'Logged out').send(res);
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword({ email: req.body.email });
  // Same response whether or not the email exists - see auth.service.js for why.
  return new ApiResponse(
    200,
    null,
    'If an account exists for that email, a reset link has been sent.'
  ).send(res);
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  return new ApiResponse(200, null, 'Password reset successful. Please log in.').send(res);
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword({ userId: req.user.userId, currentPassword, newPassword });
  return new ApiResponse(200, null, 'Password changed successfully').send(res);
});

const me = asyncHandler(async (req, res) => {
  const user = await userRepo.findById(req.user.userId);
  return new ApiResponse(200, { user }).send(res);
});

module.exports = { login, refresh, logout, forgotPassword, resetPassword, changePassword, me };
