const customerRepo = require('../repositories/customer.repository');
const auditLogRepo = require('../repositories/auditLog.repository');
const { parseCustomerImportFile } = require('./customerImport.service');
const ApiError = require('../utils/ApiError');

async function searchCustomers({ query, page, pageSize }) {
  return customerRepo.search({ query, page, pageSize });
}

async function getCustomerProfile(customerId) {
  const customer = await customerRepo.findById(customerId);
  if (!customer) throw ApiError.notFound('Customer not found');
  const [orderHistory, booksPurchased, whatsAppHistory] = await Promise.all([
    customerRepo.getOrderHistory(customerId),
    customerRepo.getBooksPurchased(customerId),
    customerRepo.getWhatsAppHistory(customerId),
  ]);
  return { ...customer, orderHistory, booksPurchased, whatsAppHistory };
}

async function importCustomersFromFile({ buffer, mimeType, actorUserId }) {
  const rows = await parseCustomerImportFile(buffer, mimeType);
  const errors = [];
  let inserted = 0, updated = 0;

  for (const row of rows) {
    if (!row.name || !row.mobile) {
      errors.push({ row: row.rowNumber, reason: 'Missing required Name or Mobile value' });
      continue;
    }
    if (!/^\d{7,15}$/.test(row.mobile.replace(/\D/g, ''))) {
      errors.push({ row: row.rowNumber, reason: `Mobile "${row.mobile}" doesn't look like a valid number` });
      continue;
    }
    try {
      const { action } = await customerRepo.upsertByMobile({ ...row, mobile: row.mobile.replace(/\D/g, '') });
      if (action === 'inserted') inserted += 1; else updated += 1;
    } catch (err) {
      errors.push({ row: row.rowNumber, reason: err.message });
    }
  }

  await auditLogRepo.record({
    userId: actorUserId, eventType: 'CUSTOMERS_IMPORTED',
    metadata: { totalRows: rows.length, inserted, updated, errorCount: errors.length },
  });
  return { totalRows: rows.length, inserted, updated, errors };
}

module.exports = { searchCustomers, getCustomerProfile, importCustomersFromFile };