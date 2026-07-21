const { sql, getPopPool } = require('../config/db');

async function create({ orderId, fileType, fileName, filePath, mimeType, sizeBytes, uploadedByUserId }) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('OrderId', sql.Int, orderId || null)
    .input('FileType', sql.NVarChar(30), fileType)
    .input('FileName', sql.NVarChar(255), fileName)
    .input('FilePath', sql.NVarChar(500), filePath)
    .input('MimeType', sql.NVarChar(100), mimeType)
    .input('SizeBytes', sql.BigInt, sizeBytes)
    .input('UploadedByUserId', sql.Int, uploadedByUserId || null)
    .query(`
      INSERT INTO dbo.Attachments (OrderId, FileType, FileName, FilePath, MimeType, SizeBytes, UploadedByUserId)
      OUTPUT INSERTED.AttachmentId, INSERTED.FileType, INSERTED.FileName, INSERTED.MimeType, INSERTED.SizeBytes, INSERTED.CreatedAt
      VALUES (@OrderId, @FileType, @FileName, @FilePath, @MimeType, @SizeBytes, @UploadedByUserId)
    `);
  return result.recordset[0];
}

async function findById(attachmentId) {
  const pool = await getPopPool();
  const result = await pool
    .request()
    .input('AttachmentId', sql.BigInt, attachmentId)
    .query(`
      SELECT AttachmentId, OrderId, FileType, FileName, FilePath, MimeType, SizeBytes, CreatedAt
      FROM dbo.Attachments
      WHERE AttachmentId = @AttachmentId
    `);
  return result.recordset[0] || null;
}

module.exports = { create, findById };
