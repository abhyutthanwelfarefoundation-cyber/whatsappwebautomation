const express = require('express');
const router = express.Router();

const whatsappMetaController = require('../controllers/whatsappMeta.controller');
const verifyMetaSignature = require('../middleware/verifyMetaSignature');

// Verification handshake (Meta calls this once when you save the webhook config)
router.get('/meta-webhook', whatsappMetaController.verifyWebhook);

// Actual incoming events — signature-checked
router.post('/meta-webhook', verifyMetaSignature, whatsappMetaController.receiveWebhook);

module.exports = router;