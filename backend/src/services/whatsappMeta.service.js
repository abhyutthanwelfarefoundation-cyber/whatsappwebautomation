/**
 * NOTE: adjust this require path to match the actual filename of your
 * existing repository (the one with listConversations/getThread/create/
 * updateStatusByWhatsAppId/findCustomerByMobile/createCustomerFromWhatsApp).
 * I don't have its filename, only its contents — likely something like
 * repositories/whatsapp.repository.js or repositories/message.repository.js.
 */
const messageRepository = require('../repositories/whatsapp.repository');

let ioInstance = null;

/**
 * Called once from server.js, same pattern as whatsappService.attachSocketServer(io).
 */
function attachSocketServer(io) {
  ioInstance = io;
}

/**
 * Meta status -> your Status column casing (matches 'Pending' / 'Read' style
 * already used in your schema).
 */
const STATUS_MAP = {
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
};

/**
 * Meta message type -> your MessageType column casing.
 * Extend this map if you support more types.
 */
const TYPE_MAP = {
  text: 'Text',
  image: 'Image',
  document: 'Document',
  audio: 'Audio',
  video: 'Video',
  sticker: 'Sticker',
  button: 'Text',
  interactive: 'Text',
};

async function processIncomingMessage(message, contacts) {
  const rawFromMobile = message.from; // Meta sends this as country code + number, e.g. "919201958456"
  // Your Customers.Mobile is stored as the last 10 digits, no country code (e.g. "9201958456").
  // Take the last 10 digits regardless of which country code Meta prefixed.
  const fromMobile = rawFromMobile.slice(-10);
  const waMessageId = message.id;
  const type = message.type;
  const messageType = TYPE_MAP[type] || 'Text';

  let content = null;
  if (type === 'text') {
    content = message.text.body;
  } else if (type === 'button') {
    content = message.button?.text;
  } else if (type === 'interactive') {
    content = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title;
  } else if (['image', 'document', 'audio', 'video', 'sticker'].includes(type)) {
    // message[type] = { id: <media-id>, mime_type, ... }
    // TODO: fetch actual file via GET https://graph.facebook.com/v21.0/{media-id}
    // (same as whatever you already do for PromoMessages media), then create
    // an Attachments row and pass attachmentId into messageRepository.create().
    // For now, storing the media id as a placeholder so nothing is lost.
    content = `[${messageType}] media_id=${message[type]?.id}`;
  }

  console.log(`[meta-webhook] Incoming ${type} from ${fromMobile}`);

  let customer = await messageRepository.findCustomerByMobile(fromMobile);

  if (!customer) {
    const profileName = contacts?.find((c) => c.wa_id === rawFromMobile)?.profile?.name;
    customer = await messageRepository.createCustomerFromWhatsApp(fromMobile, profileName);
    console.log(`[meta-webhook] Auto-created customer for unknown mobile ${fromMobile}`);
  }

  const savedMessage = await messageRepository.create({
    customerId: customer.CustomerId,
    sentByUserId: null,
    direction: 'Incoming',
    messageType,
    content,
    attachmentId: null,
    whatsAppMessageId: waMessageId,
    status: 'Delivered', // arrives as unread; markThreadRead() flips it to 'Read' when staff opens the thread
  });

  if (ioInstance) {
    ioInstance.to('staff').emit('whatsapp:new_message', savedMessage);
  }
}

async function processStatusUpdate(status) {
  const waMessageId = status.id;
  const mappedStatus = STATUS_MAP[status.status];

  if (!mappedStatus) {
    console.warn(`[meta-webhook] Unknown status value from Meta: ${status.status}`);
    return;
  }

  let failReason = null;
  if (status.status === 'failed' && status.errors?.length) {
    failReason = status.errors[0].title;
    console.error(`[meta-webhook] Delivery failed for ${waMessageId}: ${failReason}`);
  }

  const updated = await messageRepository.updateStatusByWhatsAppId(waMessageId, mappedStatus, failReason);

  if (!updated) {
    console.warn(`[meta-webhook] Status update for unknown WhatsAppMessageId: ${waMessageId}`);
    return;
  }

  console.log(`[meta-webhook] ${waMessageId} -> ${mappedStatus}`);

  if (ioInstance) {
    ioInstance.to('staff').emit('whatsapp:status_update', {
      messageId: updated.MessageId,
      customerId: updated.CustomerId,
      status: updated.Status,
    });
  }
}

module.exports = {
  attachSocketServer,
  processIncomingMessage,
  processStatusUpdate,
};