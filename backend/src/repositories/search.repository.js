const { sql, getPopPool } = require('../config/db');

/**
 * Global search covers: Customer, Invoice, Book, Mobile, Message — per spec.
 * Message search is a text-content search over dbo.Messages, which will
 * start returning real rows once Phase 3 (WhatsApp module) is populating it.
 */
async function globalSearch(query, limit = 10) {
  const pool = await getPopPool();
  const request = pool
    .request()
    .input('Query', sql.NVarChar(200), `%${query}%`)
    .input('Limit', sql.Int, limit);

  const [customers, orders, books, messages] = await Promise.all([
    request.query(`
      SELECT TOP (@Limit) CustomerId, Name, Mobile, Email
      FROM dbo.Customers
      WHERE Name LIKE @Query OR Mobile LIKE @Query OR Email LIKE @Query
    `),
    pool
      .request()
      .input('Query', sql.NVarChar(200), `%${query}%`)
      .input('Limit', sql.Int, limit)
      .query(`
        SELECT TOP (@Limit) o.OrderId, o.InvoiceNumber, o.Pub5OrderNumber, o.ChallanNumber,
               o.Status, c.Name AS CustomerName
        FROM dbo.Orders o
        INNER JOIN dbo.Customers c ON c.CustomerId = o.CustomerId
        WHERE o.InvoiceNumber LIKE @Query OR o.Pub5OrderNumber LIKE @Query OR o.ChallanNumber LIKE @Query
      `),
    pool
      .request()
      .input('Query', sql.NVarChar(200), `%${query}%`)
      .input('Limit', sql.Int, limit)
      .query(`
        SELECT TOP (@Limit) BookId, Title, Author, Isbn
        FROM dbo.Books
        WHERE Title LIKE @Query OR Author LIKE @Query OR Isbn LIKE @Query
      `),
    pool
      .request()
      .input('Query', sql.NVarChar(200), `%${query}%`)
      .input('Limit', sql.Int, limit)
      .query(`
        SELECT TOP (@Limit) m.MessageId, m.CustomerId, c.Name AS CustomerName, m.Content, m.CreatedAt
        FROM dbo.Messages m
        INNER JOIN dbo.Customers c ON c.CustomerId = m.CustomerId
        WHERE m.Content LIKE @Query
        ORDER BY m.CreatedAt DESC
      `),
  ]);

  return {
    customers: customers.recordset,
    orders: orders.recordset,
    books: books.recordset,
    messages: messages.recordset,
  };
}

module.exports = { globalSearch };
