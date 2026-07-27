const scheduledService = require('../services/scheduledMessage.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const schedule = asyncHandler(async (req, res) => {
  const { customerId, messageType, content, attachmentId, invoiceReference, scheduledFor } = req.body;
  const result = await scheduledService.scheduleMessage({ customerId, messageType, content, attachmentId, invoiceReference, scheduledFor, actorUserId: req.user.userId });
  return new ApiResponse(201, result, 'Message scheduled').send(res);
});
const list = asyncHandler(async (req, res) => {
  const result = await scheduledService.listUpcoming(req.query);
  return new ApiResponse(200, result).send(res);
});
const cancel = asyncHandler(async (req, res) => {
  const result = await scheduledService.cancelScheduled(Number(req.params.scheduledMessageId), req.user.userId);
  return new ApiResponse(200, result, 'Scheduled message cancelled').send(res);
});
module.exports = { schedule, list, cancel };