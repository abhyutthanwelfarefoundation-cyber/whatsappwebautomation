const { Pool } = require('pg');
const logger = require('./logger');

let pool = null;

async function getPopPool() {
  if (pool) return pool;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
  });
  pool.on('error', (err) => logger.error('DB pool error', { err }));
  await pool.query('SELECT 1');
  logger.info('Connected to PublisherOperations database');
  return pool;
}

async function closeAllPools() {
  if (pool) await pool.end();
}

module.exports = { getPopPool, closeAllPools };