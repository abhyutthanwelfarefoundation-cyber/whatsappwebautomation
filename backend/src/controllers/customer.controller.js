const customerService = require('../services/customer.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const search = asyncHandler(async (req, res) => {
  const result = await customerService.searchCustomers(req.query);
  return new ApiResponse(200, result).send(res);
});

const getProfile = asyncHandler(async (req, res) => {
  const profile = await customerService.getCustomerProfile(Number(req.params.customerId));
  return new ApiResponse(200, profile).send(res);
});

const importCustomers = asyncHandler(async (req, res) => {
  if (!req.file) return new ApiResponse(400, null, 'No file uploaded').send(res);
  const result = await customerService.importCustomersFromFile({
    buffer: req.file.buffer, mimeType: req.file.mimetype, actorUserId: req.user.userId,
  });
  return new ApiResponse(200, result, 'Import complete').send(res);
});

module.exports = { search, getProfile, importCustomers };