const whatsappMetaService = require('../services/whatsappMeta.service');

/**
 * GET /api/whatsapp/meta-webhook
 * One-time verification handshake — Meta calls this when you click
 * "Verify and Save" in the App Dashboard's webhook configuration screen.
 */
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('[meta-webhook] Verified successfully');
    return res.status(200).send(challenge);
  }

  console.warn('[meta-webhook] Verification failed — token mismatch');
  return res.sendStatus(403);
}

/**
 * POST /api/whatsapp/meta-webhook
 * Receives incoming messages and status updates. Acks immediately (Meta
 * expects a fast 200), then processes the payload asynchronously.
 */
function receiveWebhook(req, res) {
  res.sendStatus(200); // ack first, always

  processPayload(req.body).catch((err) => {
    console.error('[meta-webhook] Error processing payload:', err);
  });
}

async function processPayload(body) {
  const entries = body.entry || [];

  for (const entry of entries) {
    const changes = entry.changes || [];

    for (const change of changes) {
      const value = change.value || {};

      if (value.messages) {
        for (const message of value.messages) {
          await whatsappMetaService.processIncomingMessage(message, value.contacts);
        }
      }

      if (value.statuses) {
        for (const status of value.statuses) {
          await whatsappMetaService.processStatusUpdate(status);
        }
      }
    }
  }
}

module.exports = {
  verifyWebhook,
  receiveWebhook,
};