const express = require('express');
const authRoutes = require('./auth.routes');
const customerRoutes = require('./customer.routes');
const orderRoutes = require('./order.routes');
const searchRoutes = require('./search.routes');
const whatsappRoutes = require('./whatsapp.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'POP API is running' }));

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/search', searchRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/dashboard', dashboardRoutes);
// Phase 4+: router.use('/dashboard', dashboardRoutes);
// Phase 4+: router.use('/reports', reportRoutes);
// Phase 4+: router.use('/settings', settingsRoutes);
// Phase 4+: router.use('/audit-logs', auditLogRoutes);

module.exports = router;
