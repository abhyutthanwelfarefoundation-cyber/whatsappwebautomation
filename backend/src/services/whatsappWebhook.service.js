/**
 * Parses Meta WhatsApp Cloud API webhook payloads.
 * Reference shape: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 *
 * If PromoMessages wraps/reshapes this payload before forwarding it to us
 * (their callback URL was shown as callback.pinbot.ai in earlier
 * discussion), this is the file to adjust - everything else stays the same.
 */
const whatsappService = require('./whatsapp.service');
const logger = require('../config/logger');

async function processWebhookPayload(body) {
  const entries = body.entry || [];

  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      const value = change.value || {};

      // Incoming messages from customers
      if (Array.isArray(value.messages)) {
        for (const msg of value.messages) {
          await handleInboundMessage(msg, value.contacts);
        }
      }

      // Delivery/read/failed status updates for messages WE sent
      if (Array.isArray(value.statuses)) {
        for (const status of value.statuses) {
          await handleStatusUpdate(status);
        }
      }
    }
  }
}

async function handleInboundMessage(msg, contacts) {
  const fromMobile = msg.from; // digits only, e.g. "919812345001"
  const contact = (contacts || []).find((c) => c.wa_id === fromMobile);
  const displayName = contact?.profile?.name;

  let messageType = 'Text';
  let content = '';

  switch (msg.type) {
    case 'text':
      messageType = 'Text';
      content = msg.text?.body || '';
      break;
    case 'image':
      messageType = 'Image';
      content = msg.image?.caption || '[Image received]';
      break;
    case 'document':
      messageType = 'Document';
      content = msg.document?.filename || '[Document received]';
      break;
    default:
      messageType = 'Text';
      content = `[Unsupported message type: ${msg.type}]`;
  }

  await whatsappService.handleIncomingMessage({ fromMobile, displayName, messageType, content });
}

async function handleStatusUpdate(status) {
  // status.status is one of: sent, delivered, read, failed
  const failReason = status.errors?.[0]?.title || null;
  await whatsappService.handleStatusWebhook(status.id, status.status, failReason);
}

/** Meta's GET verification handshake when you register the webhook URL. */
function verifyChallenge(query, expectedToken) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token === expectedToken) {
    return challenge;
  }
  logger.warn('WhatsApp webhook verification failed', { mode, tokenMatches: token === expectedToken });
  return null;
}

module.exports = { processWebhookPayload, verifyChallenge };
