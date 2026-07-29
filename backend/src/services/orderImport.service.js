const ExcelJS = require('exceljs');
const ApiError = require('../utils/ApiError');

const ALIASES = {
  invoiceNumber: ['invoice number', 'invoice', 'invoice no'],
  pub5OrderNumber: ['order number', 'order no', 'pub5 order number'],
  challanNumber: ['challan number', 'challan no', 'challan'],
  customerMobile: ['mobile', 'customer mobile', 'mobile number', 'phone'],
  amount: ['amount', 'total', 'total amount', 'bill amount'],
  status: ['status', 'order status'],
  dispatchStatus: ['dispatch status', 'dispatch'],
  orderDate: ['order date', 'date'],
};

function normalize(h) { return String(h || '').trim().toLowerCase(); }

function buildHeaderMap(headerRow) {
  const map = {};
  headerRow.forEach((v, i) => {
    const n = normalize(v);
    if (!n) return;
    for (const [field, aliases] of Object.entries(ALIASES)) {
      if (aliases.includes(n)) map[field] = i;
    }
  });
  return map;
}

async function parseOrderImportFile(buffer, mimeType) {
  const workbook = new ExcelJS.Workbook();
  if (mimeType === 'text/csv') {
    const { Readable } = require('stream');
    await workbook.csv.read(Readable.from(buffer));
  } else {
    await workbook.xlsx.load(buffer);
  }
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw ApiError.badRequest('The uploaded file has no worksheets');

  const headerMap = buildHeaderMap(worksheet.getRow(1).values);
  if (headerMap.customerMobile === undefined || headerMap.amount === undefined) {
    throw ApiError.badRequest('Could not find required "Mobile" and "Amount" columns in the file.');
  }

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values;
    const getCell = (field) => {
      const idx = headerMap[field];
      if (idx === undefined) return null;
      const raw = values[idx];
      if (raw === null || raw === undefined) return null;
      if (raw instanceof Date) return raw.toISOString();
      if (typeof raw === 'object' && raw.text) return String(raw.text).trim();
      return String(raw).trim();
    };
    const customerMobile = getCell('customerMobile');
    const amount = getCell('amount');
    if (!customerMobile && !amount) return;
    rows.push({
      rowNumber,
      invoiceNumber: getCell('invoiceNumber'),
      pub5OrderNumber: getCell('pub5OrderNumber'),
      challanNumber: getCell('challanNumber'),
      customerMobile,
      amount: parseFloat(amount) || 0,
      status: getCell('status') || 'Pending',
      dispatchStatus: getCell('dispatchStatus') || 'Pending',
      orderDate: getCell('orderDate'),  
    });
  });
  return rows;
}

module.exports = { parseOrderImportFile };