const ExcelJS = require('exceljs');
const ApiError = require('../utils/ApiError');

const COLUMN_ALIASES = {
  name: ['name', 'customer name', 'party name', 'party'],
  mobile: ['mobile', 'mobile number', 'phone', 'contact number'],
  altMobile: ['alt mobile', 'alternate mobile', 'alt phone'],
  email: ['email', 'email address', 'e-mail'],
  address: ['address', 'address1', 'billing address'],
  city: ['city'],
  state: ['state'],
  outstandingBalance: ['outstanding', 'outstanding balance', 'balance', 'due amount'],
  pub5CustomerCode: ['pub5 code', 'party code', 'customer code', 'pub5customercode'],
};

function normalizeHeader(h) { return String(h || '').trim().toLowerCase(); }

function buildHeaderMap(headerRow) {
  const map = {};
  headerRow.forEach((cellValue, index) => {
    const normalized = normalizeHeader(cellValue);
    if (!normalized) return;
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(normalized)) map[field] = index;
    }
  });
  return map;
}

async function parseCustomerImportFile(buffer, mimeType) {
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
  if (headerMap.name === undefined || headerMap.mobile === undefined) {
    throw ApiError.badRequest('Could not find required "Name" and "Mobile" columns in the file.');
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
      if (typeof raw === 'object' && raw.text) return String(raw.text).trim();
      return String(raw).trim();
    };
    const name = getCell('name');
    const mobile = getCell('mobile');
    if (!name && !mobile) return;
    rows.push({
      rowNumber, name, mobile,
      altMobile: getCell('altMobile'),
      email: getCell('email'),
      address: getCell('address'),
      city: getCell('city'),
      state: getCell('state'),
      outstandingBalance: parseFloat(getCell('outstandingBalance')) || 0,
      pub5CustomerCode: getCell('pub5CustomerCode'),
    });
  });
  return rows;
}

module.exports = { parseCustomerImportFile };