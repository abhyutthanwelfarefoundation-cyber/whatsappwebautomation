const { sql, getPopPool } = require('../config/db');
const messageRepo = require('../repositories/message.repository');
const attachmentRepo = require('../repositories/attachment.repository');
const customerRepo = require('../repositories/customer.repository');
const auditLogRepo = require('../repositories/auditLog.repository');
const provider = require('./whatsappProvider.service');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

let ioInstance = null;
function attachSocketServer(io) {
  ioInstance = io;
}

function emitToAll(event, payload) {
  if (ioInstance) ioInstance.emit(event, payload);
}

async function listConversations(params) {
  return messageRepo.listConversations(params);
}

async function getThread(customerId, params) {
  const customer = await customerRepo.findById(customerId);
  if (!customer) throw ApiError.notFound('Customer not found');
  const messages = await messageRepo.getThread(customerId, params);
  return { customer, messages };
}

async function markRead(customerId) {
  await messageRepo.markThreadRead(customerId);
  emitToAll('conversation:read', { customerId });
}

async function sendText({ customerId, content, actorUserId }) {
  const customer = await customerRepo.findById(customerId);
  if (!customer) throw ApiError.notFound('Customer not found');

  let message = await messageRepo.create({
    customerId,
    sentByUserId: actorUserId,
    direction: 'Outgoing',
    messageType: 'Text',
    content,
    status: 'Pending',
  });
  emitToAll('message:new', message);

  try {
    const { whatsAppMessageId } = await provider.sendText(customer.Mobile, content);
    message = await updateSentMessage(message.MessageId, whatsAppMessageId, 'Sent');
  } catch (err) {
    message = await updateSentMessage(message.MessageId, null, 'Failed', err.message);
    throw err;
  }

  await auditLogRepo.record({ userId: actorUserId, eventType: 'MESSAGE_SENT', entityType: 'Message', entityId: message.MessageId });
  return message;
}

async function sendAttachment({ customerId, attachmentId, caption, actorUserId }) {
  const customer = await customerRepo.findById(customerId);
  if (!customer) throw ApiError.notFound('Customer not found');

  const attachment = await attachmentRepo.findById(attachmentId);
  if (!attachment) throw ApiError.notFound('Attachment not found');

  const mediaType = attachment.MimeType.startsWith('image/') ? 'image' : 'document';

  let message = await messageRepo.create({
    customerId,
    sentByUserId: actorUserId,
    direction: 'Outgoing',
    messageType: mediaType === 'image' ? 'Image' : attachment.FileType === 'PDF' ? 'PDF' : 'Document',
    content: caption || null,
    attachmentId,
    status: 'Pending',
  });
  emitToAll('message:new', message);

  try {
    const mediaId = await provider.uploadMedia(attachment.FilePath, attachment.MimeType);
    const { whatsAppMessageId } = await provider.sendMediaById(
      customer.Mobile,
      mediaType,
      mediaId,
      attachment.FileName,
      caption
    );
    message = await updateSentMessage(message.MessageId, whatsAppMessageId, 'Sent');
  } catch (err) {
    message = await updateSentMessage(message.MessageId, null, 'Failed', err.message);
    throw err;
  }

  await auditLogRepo.record({ userId: actorUserId, eventType: 'MESSAGE_SENT', entityType: 'Message', entityId: message.MessageId });
  return message;
}

async function updateSentMessage(messageId, whatsAppMessageId, status, failReason = null) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('MessageId', sql.BigInt, messageId)
    .input('WhatsAppMessageId', sql.NVarChar(150), whatsAppMessageId)
    .input('Status', sql.NVarChar(20), status)
    .input('FailReason', sql.NVarChar(500), failReason).query(`
      UPDATE dbo.Messages
      SET WhatsAppMessageId = COALESCE(@WhatsAppMessageId, WhatsAppMessageId),
          Status = @Status,
          FailReason = @FailReason,
          UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE MessageId = @MessageId
    `);
  const updated = result.recordset[0];
  emitToAll('message:status', { messageId: updated.MessageId, status: updated.Status, failReason: updated.FailReason });
  return updated;
}

async function handleStatusWebhook(whatsAppMessageId, status, failReason) {
  const normalizedStatus = { sent: 'Sent', delivered: 'Delivered', read: 'Read', failed: 'Failed' }[status] || status;
  const updated = await messageRepo.updateStatusByWhatsAppId(whatsAppMessageId, normalizedStatus, failReason);
  if (updated) {
    emitToAll('message:status', { messageId: updated.MessageId, status: updated.Status, customerId: updated.CustomerId });
  }
  return updated;
}

async function handleIncomingMessage({ fromMobile, displayName, messageType, content }) {
  let customer = await messageRepo.findCustomerByMobile(fromMobile);
  if (!customer) {
    customer = await messageRepo.createCustomerFromWhatsApp(fromMobile, displayName);
    logger.info('Created new customer from inbound WhatsApp message', { customerId: customer.CustomerId, fromMobile });
  }

  const message = await messageRepo.create({
    customerId: customer.CustomerId,
    direction: 'Incoming',
    messageType,
    content,
    status: 'Delivered',
  });

  emitToAll('message:new', message);
  emitToAll('conversation:updated', { customerId: customer.CustomerId });
  return message;
}

async function deleteMessage(messageId, actorUserId) {
  const message = await messageRepo.findById(messageId);
  if (!message) throw ApiError.notFound('Message not found');

  await messageRepo.softDelete(messageId, actorUserId);
  await auditLogRepo.record({ userId: actorUserId, eventType: 'MESSAGE_DELETED', entityType: 'Message', entityId: messageId });

  emitToAll('message:deleted', { messageId, customerId: message.CustomerId });
  return { messageId, customerId: message.CustomerId };
}

async function retryMessage(messageId, actorUserId) {
  const message = await messageRepo.findById(messageId);
  if (!message) throw ApiError.notFound('Message not found');
  if (message.Direction !== 'Outgoing') {
    throw ApiError.badRequest('Only outgoing messages can be retried');
  }
  if (message.Status !== 'Failed') {
    throw ApiError.badRequest('Only failed messages can be retried');
  }

  let updated = await messageRepo.resetForRetry(messageId);
  emitToAll('message:status', { messageId: updated.MessageId, status: updated.Status, customerId: updated.CustomerId });

  try {
    if (message.AttachmentId) {
      const attachment = await attachmentRepo.findById(message.AttachmentId);
      if (!attachment) throw ApiError.notFound('Original attachment no longer available');
      const mediaType = attachment.MimeType.startsWith('image/') ? 'image' : 'document';
      const mediaId = await provider.uploadMedia(attachment.FilePath, attachment.MimeType);
      const { whatsAppMessageId } = await provider.sendMediaById(
        message.CustomerMobile,
        mediaType,
        mediaId,
        attachment.FileName,
        message.Content
      );
      updated = await updateSentMessage(messageId, whatsAppMessageId, 'Sent');
    } else {
      const { whatsAppMessageId } = await provider.sendText(message.CustomerMobile, message.Content);
      updated = await updateSentMessage(messageId, whatsAppMessageId, 'Sent');
    }
  } catch (err) {
    updated = await updateSentMessage(messageId, null, 'Failed', err.message);
    throw err;
  }

  await auditLogRepo.record({ userId: actorUserId, eventType: 'MESSAGE_RETRIED', entityType: 'Message', entityId: messageId });
  return updated;
}

/**
 * Sends the approved "invoices" WhatsApp template (Utility category,
 * document header, body: "hi {{2}} this is your bill {{1}}"). This is the
 * ONLY way to message a customer who hasn't messaged us first in the last
 * 24 hours - per WhatsApp's platform rules, free-form text/attachments
 * only work inside that window, but an approved template works anytime.
 *
 * Template placeholder order: parameters are matched positionally as
 * {{1}}, {{2}} regardless of where they appear in the approved body text.
 * For "invoices": {{1}} = bill/invoice reference, {{2}} = customer name.
 */
async function sendInvoiceTemplate({ customerId, attachmentId, invoiceReference, actorUserId }) {
  const customer = await customerRepo.findById(customerId);
  if (!customer) throw ApiError.notFound('Customer not found');

  const attachment = await attachmentRepo.findById(attachmentId);
  if (!attachment) throw ApiError.notFound('Attachment not found');
  if (attachment.MimeType !== 'application/pdf') {
    throw ApiError.badRequest('The invoices template requires a PDF attachment');
  }

  let message = await messageRepo.create({
    customerId,
    sentByUserId: actorUserId,
    direction: 'Outgoing',
    messageType: 'Template',
    content: `Invoice template sent - ref: ${invoiceReference}`,
    attachmentId,
    status: 'Pending',
  });
  emitToAll('message:new', message);

  try {
    const mediaId = await provider.uploadMedia(attachment.FilePath, attachment.MimeType);
    const components = [
      {
        type: 'header',
        parameters: [{ type: 'document', document: { id: mediaId, filename: attachment.FileName } }],
      },
      {
        type: 'body',
        parameters: [
          { type: 'text', text: invoiceReference },
          { type: 'text', text: customer.Name },
        ],
      },
    ];
    const { whatsAppMessageId } = await provider.sendTemplate(customer.Mobile, 'invoices', 'en', components);
    message = await updateSentMessage(message.MessageId, whatsAppMessageId, 'Sent');
  } catch (err) {
    message = await updateSentMessage(message.MessageId, null, 'Failed', err.message);
    throw err;
  }

  await auditLogRepo.record({
    userId: actorUserId,
    eventType: 'TEMPLATE_MESSAGE_SENT',
    entityType: 'Message',
    entityId: message.MessageId,
    metadata: { template: 'invoices', invoiceReference },
  });
  return message;
}

module.exports = {
  attachSocketServer,
  listConversations,
  getThread,
  markRead,
  sendText,
  sendAttachment,
  sendInvoiceTemplate,
  deleteMessage,
  retryMessage,
  handleStatusWebhook,
  handleIncomingMessage,
};