const express = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../validators/auth.validator');
const { authenticate } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

router.post('/login', authLimiter, validate('login'), authController.login);
router.post('/refresh', validate('refresh'), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authLimiter, validate('forgotPassword'), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate('resetPassword'), authController.resetPassword);
router.post('/change-password', authenticate, validate('changePassword'), authController.changePassword);
router.get('/me', authenticate, authController.me);

module.exports = router;
