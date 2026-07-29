const express = require('express');
const controller = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { validateQuery, validateBody } = require('../validators/common.validator');
const { importUpload } = require('../middleware/upload.middleware');

const router = express.Router();

router.use(authenticate);
router.post('/import', requirePermission('orders.manage'), importUpload.single('file'), controller.importOrders);
router.post('/', requirePermission('orders.manage'), validateBody('orderCreate'), controller.create);
router.get('/', requirePermission('orders.view'), validateQuery('orderList'), controller.list);
router.get('/:orderId', requirePermission('orders.view'), controller.getDetail);
router.patch(
  '/:orderId/status',
  requirePermission('orders.manage'),
  validateBody('orderStatusUpdate'),
  controller.updateStatus
);

module.exports = router;
