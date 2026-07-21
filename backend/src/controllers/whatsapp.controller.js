const path = require('path');
const whatsappService = require('../services/whatsapp.service');
const webhookService = require('../services/whatsappWebhook.service');
const attachmentRepo = require('../repositories/attachment.repository');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { env } = require('../config/env');
const logger = require('../config/logger');

const listConversations = asyncHandler(async (req, res) => {
  const result = await whatsappService.listConversations(req.query);
  return new ApiResponse(200, result).send(res);
});

const getThread = asyncHandler(async (req, res) => {
  const result = await whatsappService.getThread(Number(req.params.customerId), req.query);
  return new ApiResponse(200, result).send(res);
});

const markRead = asyncHandler(async (req, res) => {
  await whatsappService.markRead(Number(req.params.customerId));
  return new ApiResponse(200, null, 'Marked as read').send(res);
});

const sendMessage = asyncHandler(async (req, res) => {
  const { customerId, content, attachmentId, caption } = req.body;
  let message;
  if (attachmentId) {
    message = await whatsappService.sendAttachment({
      customerId,
      attachmentId,
      caption,
      actorUserId: req.user.userId,
    });
  } else {
    message = await whatsappService.sendText({ customerId, content, actorUserId: req.user.userId });
  }
  return new ApiResponse(201, message, 'Message sent').send(res);
});

const deleteMessage = asyncHandler(async (req, res) => {
  const result = await whatsappService.deleteMessage(Number(req.params.messageId), req.user.userId);
  return new ApiResponse(200, result, 'Message deleted').send(res);
});

const retryMessage = asyncHandler(async (req, res) => {
  const message = await whatsappService.retryMessage(Number(req.params.messageId), req.user.userId);
  return new ApiResponse(200, message, 'Message resent').send(res);
});

const sendInvoiceTemplate = asyncHandler(async (req, res) => {
  const { customerId, attachmentId, invoiceReference } = req.body;
  const message = await whatsappService.sendInvoiceTemplate({
    customerId,
    attachmentId,
    invoiceReference,
    actorUserId: req.user.userId,
  });
  return new ApiResponse(201, message, 'Invoice template sent').send(res);
});

const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    return new ApiResponse(400, null, 'No file uploaded').send(res);
  }
  const attachment = await attachmentRepo.create({
    orderId: req.body.orderId ? Number(req.body.orderId) : null,
    fileType: req.body.fileType || 'Document',
    fileName: req.file.originalname,
    filePath: req.file.path,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    uploadedByUserId: req.user.userId,
  });
  return new ApiResponse(201, attachment, 'File uploaded').send(res);
});

const downloadAttachment = asyncHandler(async (req, res) => {
  const attachment = await attachmentRepo.findById(Number(req.params.attachmentId));
  if (!attachment) {
    return new ApiResponse(404, null, 'Attachment not found').send(res);
  }
  res.setHeader('Content-Type', attachment.MimeType);
  res.setHeader('Content-Disposition', `inline; filename="${attachment.FileName}"`);
  res.sendFile(path.resolve(attachment.FilePath));
});

/** GET - Meta's webhook verification handshake. Public, no auth. */
const verifyWebhook = (req, res) => {
  const challenge = webhookService.verifyChallenge(req.query, env.whatsapp.webhookVerifyToken);
  if (challenge) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

/** POST - actual incoming messages / status updates. Public, no auth (Meta calls this directly). */
const receiveWebhook = asyncHandler(async (req, res) => {
  res.sendStatus(200);
  try {
    await webhookService.processWebhookPayload(req.body);
  } catch (err) {
    logger.error('Failed to process WhatsApp webhook payload', { err: err.message });
  }
});

module.exports = {
  listConversations,
  getThread,
  markRead,
  sendMessage,
  deleteMessage,
  retryMessage,
  sendInvoiceTemplate,
  uploadAttachment,
  downloadAttachment,
  verifyWebhook,
  receiveWebhook,
};