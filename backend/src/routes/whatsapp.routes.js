const express = require('express');
const controller = require('../controllers/whatsapp.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { validateQuery, validateBody } = require('../validators/common.validator');
const { upload } = require('../middleware/upload.middleware');

const router = express.Router();

// --- Webhook endpoints: PUBLIC, called directly by Meta/PromoMessages, no JWT ---
router.get('/webhook', controller.verifyWebhook);
router.post('/webhook', controller.receiveWebhook);

// --- Everything else requires auth ---
router.use(authenticate);

router.get('/conversations', requirePermission('whatsapp.view'), validateQuery('conversationList'), controller.listConversations);
router.get('/conversations/:customerId', requirePermission('whatsapp.view'), validateQuery('threadQuery'), controller.getThread);
router.post('/conversations/:customerId/read', requirePermission('whatsapp.view'), controller.markRead);

router.post('/messages', requirePermission('whatsapp.send'), validateBody('sendMessage'), controller.sendMessage);
router.post('/messages/template/invoice', requirePermission('whatsapp.send'), validateBody('sendInvoiceTemplate'), controller.sendInvoiceTemplate);
router.delete('/messages/:messageId', requirePermission('whatsapp.send'), controller.deleteMessage);
router.post('/messages/:messageId/retry', requirePermission('whatsapp.send'), controller.retryMessage);
router.post('/attachments', requirePermission('whatsapp.send'), upload.single('file'), controller.uploadAttachment);
router.get('/attachments/:attachmentId/download', requirePermission('whatsapp.view'), controller.downloadAttachment);

module.exports = router;