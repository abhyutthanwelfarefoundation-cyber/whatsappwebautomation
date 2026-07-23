const { getPopPool } = require('../config/db');
async function globalSearch(query, limit = 10) {
  const pool = await getPopPool();
  const q = `%${query}%`;
  const [customers, orders, books, messages] = await Promise.all([
    pool.query(`SELECT "CustomerId", "Name", "Mobile", "Email" FROM "Customers" WHERE "Name" ILIKE $1 OR "Mobile" ILIKE $1 OR "Email" ILIKE $1 LIMIT $2`, [q, limit]),
    pool.query(`SELECT o."OrderId", o."InvoiceNumber", o."Pub5OrderNumber", o."ChallanNumber", o."Status", c."Name" AS "CustomerName" FROM "Orders" o INNER JOIN "Customers" c ON c."CustomerId" = o."CustomerId" WHERE o."InvoiceNumber" ILIKE $1 OR o."Pub5OrderNumber" ILIKE $1 OR o."ChallanNumber" ILIKE $1 LIMIT $2`, [q, limit]),
    pool.query(`SELECT "BookId", "Title", "Author", "Isbn" FROM "Books" WHERE "Title" ILIKE $1 OR "Author" ILIKE $1 OR "Isbn" ILIKE $1 LIMIT $2`, [q, limit]),
    pool.query(`SELECT m."MessageId", m."CustomerId", c."Name" AS "CustomerName", m."Content", m."CreatedAt" FROM "Messages" m INNER JOIN "Customers" c ON c."CustomerId" = m."CustomerId" WHERE m."Content" ILIKE $1 ORDER BY m."CreatedAt" DESC LIMIT $2`, [q, limit]),
  ]);
  return { customers: customers.rows, orders: orders.rows, books: books.rows, messages: messages.rows };
}
module.exports = { globalSearch };