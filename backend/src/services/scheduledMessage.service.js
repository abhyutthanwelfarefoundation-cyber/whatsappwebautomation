const scheduledRepo = require('../repositories/scheduledMessage.repository');
const customerRepo = require('../repositories/customer.repository');
const auditLogRepo = require('../repositories/auditLog.repository');
const whatsappService = require('./whatsapp.service');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

async function scheduleMessage({ customerId, messageType, content, attachmentId, invoiceReference, scheduledFor, actorUserId }) {
  const customer = await customerRepo.findById(customerId);
  if (!customer) throw ApiError.notFound('Customer not found');
  const when = new Date(scheduledFor);
  if (isNaN(when.getTime()) || when.getTime() <= Date.now()) throw ApiError.badRequest('Scheduled time must be a valid date in the future');
  if (messageType === 'Template' && !invoiceReference) throw ApiError.badRequest('invoiceReference is required for a scheduled template message');
  if ((messageType === 'Document' || messageType === 'Image' || messageType === 'Template') && !attachmentId) throw ApiError.badRequest('attachmentId is required for this message type');
  const scheduled = await scheduledRepo.create({ customerId, createdByUserId: actorUserId, messageType, content, attachmentId, invoiceReference, scheduledFor: when });
  await auditLogRepo.record({ userId: actorUserId, eventType: 'MESSAGE_SCHEDULED', entityType: 'ScheduledMessage', entityId: scheduled.ScheduledMessageId });
  return scheduled;
}
async function listUpcoming(params) { return scheduledRepo.listUpcoming(params); }
async function cancelScheduled(scheduledMessageId, actorUserId) {
  const cancelled = await scheduledRepo.cancel(scheduledMessageId);
  if (!cancelled) throw ApiError.notFound('Scheduled message not found or already sent/cancelled');
  await auditLogRepo.record({ userId: actorUserId, eventType: 'SCHEDULED_MESSAGE_CANCELLED', entityType: 'ScheduledMessage', entityId: scheduledMessageId });
  return cancelled;
}
async function processDueMessages() {
  let due;
  try { due = await scheduledRepo.findDue(); } catch (err) { logger.error('Failed to fetch due scheduled messages', { err: err.message }); return; }
  for (const item of due) {
    try {
      if (item.MessageType === 'Template') {
        await whatsappService.sendInvoiceTemplate({ customerId: item.CustomerId, attachmentId: item.AttachmentId, invoiceReference: item.InvoiceReference, actorUserId: item.CreatedByUserId });
      } else if (item.AttachmentId) {
        await whatsappService.sendAttachment({ customerId: item.CustomerId, attachmentId: item.AttachmentId, caption: item.Content, actorUserId: item.CreatedByUserId });
      } else {
        await whatsappService.sendText({ customerId: item.CustomerId, content: item.Content, actorUserId: item.CreatedByUserId });
      }
      await scheduledRepo.markStatus(item.ScheduledMessageId, 'Sent');
    } catch (err) {
      logger.error('Scheduled message failed to send', { scheduledMessageId: item.ScheduledMessageId, err: err.message });
      await scheduledRepo.markStatus(item.ScheduledMessageId, 'Failed', err.message);
    }
  }
}
let intervalHandle = null;
function startScheduler(intervalMs = 60000) {
  if (intervalHandle) return;
  processDueMessages().catch((err) => logger.error('Initial scheduler check failed', { err: err.message }));
  intervalHandle = setInterval(() => { processDueMessages().catch((err) => logger.error('Scheduler tick failed', { err: err.message })); }, intervalMs);
  logger.info(`Message scheduler started (checking every ${intervalMs / 1000}s)`);
}
module.exports = { scheduleMessage, listUpcoming, cancelScheduled, processDueMessages, startScheduler };