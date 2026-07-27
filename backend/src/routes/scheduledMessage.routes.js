const express = require('express');
const controller = require('../controllers/scheduledMessage.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { validateBody, validateQuery } = require('../validators/common.validator');

const router = express.Router();
router.use(authenticate);
router.post('/', requirePermission('whatsapp.schedule'), validateBody('scheduleMessage'), controller.schedule);
router.get('/', requirePermission('whatsapp.schedule'), validateQuery('scheduledList'), controller.list);
router.delete('/:scheduledMessageId', requirePermission('whatsapp.schedule'), controller.cancel);
module.exports = router;