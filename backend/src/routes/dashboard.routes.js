const express = require('express');
const controller = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

const router = express.Router();
router.get('/stats', authenticate, requirePermission('dashboard.view'), controller.getStats);
router.get('/invoices-sent', authenticate, requirePermission('dashboard.view'), controller.getInvoicesSent);
module.exports = router;