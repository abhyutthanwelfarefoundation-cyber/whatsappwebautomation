const orderService = require('../services/order.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const list = asyncHandler(async (req, res) => {
  const result = await orderService.listOrders(req.query);
  return new ApiResponse(200, result).send(res);
});

const getDetail = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderDetail(Number(req.params.orderId));
  return new ApiResponse(200, order).send(res);
});

const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(
    Number(req.params.orderId),
    req.body,
    req.user.userId
  );
  return new ApiResponse(200, order, 'Order updated').send(res);
});

const importOrders = asyncHandler(async (req, res) => {
  if (!req.file) return new ApiResponse(400, null, 'No file uploaded').send(res);
  const result = await orderService.importOrdersFromFile({ buffer: req.file.buffer, mimeType: req.file.mimetype, actorUserId: req.user.userId });
  return new ApiResponse(200, result, 'Import complete').send(res);
});

const create = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.body, req.user.userId);
  return new ApiResponse(201, order, 'Order created').send(res);
});

module.exports = { list, getDetail, updateStatus , importOrders , create};
