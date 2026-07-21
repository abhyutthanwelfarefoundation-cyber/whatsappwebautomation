const orderRepo = require('../repositories/order.repository');
const auditLogRepo = require('../repositories/auditLog.repository');
const ApiError = require('../utils/ApiError');

const VALID_STATUSES = ['Pending', 'Invoiced', 'Dispatched', 'Completed', 'Cancelled'];
const VALID_DISPATCH_STATUSES = ['Pending', 'Packed', 'Dispatched', 'Delivered'];
const customerRepo = require('../repositories/customer.repository');
const { parseOrderImportFile } = require('./orderImport.service');

async function listOrders(filters) {
  return orderRepo.list(filters);
}

async function getOrderDetail(orderId) {
  const order = await orderRepo.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

async function updateOrderStatus(orderId, { status, dispatchStatus }, actorUserId) {
  if (status && !VALID_STATUSES.includes(status)) {
    throw ApiError.badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  if (dispatchStatus && !VALID_DISPATCH_STATUSES.includes(dispatchStatus)) {
    throw ApiError.badRequest(
      `Invalid dispatch status. Must be one of: ${VALID_DISPATCH_STATUSES.join(', ')}`
    );
  }

  const existing = await orderRepo.findById(orderId);
  if (!existing) throw ApiError.notFound('Order not found');

  await orderRepo.updateStatus(orderId, { status, dispatchStatus });

  await auditLogRepo.record({
    userId: actorUserId,
    eventType: 'ORDER_STATUS_CHANGED',
    entityType: 'Order',
    entityId: orderId,
    metadata: { previous: { status: existing.Status, dispatchStatus: existing.DispatchStatus }, next: { status, dispatchStatus } },
  });

  return orderRepo.findById(orderId);
}

async function importOrdersFromFile({ buffer, mimeType, actorUserId }) {
  const rows = await parseOrderImportFile(buffer, mimeType);
  const errors = [];
  let inserted = 0, updated = 0;
  for (const row of rows) {
    if (!row.customerMobile) { errors.push({ row: row.rowNumber, reason: 'Missing Mobile number' }); continue; }
    const mobile = row.customerMobile.replace(/\D/g, '');
    const customer = await customerRepo.findByMobile(mobile);
    if (!customer) { errors.push({ row: row.rowNumber, reason: `No customer found with mobile ${mobile} - import customers first` }); continue; }
    try {
      const action = await orderRepo.upsertFromImport({ ...row, customerId: customer.CustomerId });
      if (action === 'inserted') inserted += 1; else updated += 1;
    } catch (err) { errors.push({ row: row.rowNumber, reason: err.message }); }
  }
  await auditLogRepo.record({ userId: actorUserId, eventType: 'ORDERS_IMPORTED', metadata: { totalRows: rows.length, inserted, updated, errorCount: errors.length } });
  return { totalRows: rows.length, inserted, updated, errors };
}

module.exports = { listOrders, getOrderDetail, updateOrderStatus, importOrdersFromFile };
