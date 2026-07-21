const express = require('express');
const controller = require('../controllers/customer.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { validateQuery } = require('../validators/common.validator');
const { importUpload } = require('../middleware/upload.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', requirePermission('customers.view'), validateQuery('customerSearch'), controller.search);
router.post('/import', requirePermission('customers.manage'), importUpload.single('file'), controller.importCustomers);
router.get('/:customerId', requirePermission('customers.view'), controller.getProfile);

module.exports = router;