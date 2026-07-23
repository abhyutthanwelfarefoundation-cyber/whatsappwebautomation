const { getPopPool } = require('../config/db');
async function create({ orderId, fileType, fileName, filePath, mimeType, sizeBytes, uploadedByUserId }) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`INSERT INTO "Attachments" ("OrderId", "FileType", "FileName", "FilePath", "MimeType", "SizeBytes", "UploadedByUserId") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "AttachmentId", "FileType", "FileName", "MimeType", "SizeBytes", "CreatedAt"`, [orderId || null, fileType, fileName, filePath, mimeType, sizeBytes, uploadedByUserId || null]);
  return rows[0];
}
async function findById(attachmentId) {
  const pool = await getPopPool();
  const { rows } = await pool.query(`SELECT "AttachmentId", "OrderId", "FileType", "FileName", "FilePath", "MimeType", "SizeBytes", "CreatedAt" FROM "Attachments" WHERE "AttachmentId" = $1`, [attachmentId]);
  return rows[0] || null;
}
module.exports = { create, findById };