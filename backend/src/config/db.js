const sql = require('mssql');
const { env } = require('./env');
const logger = require('./logger');

let popPool = null;
let pub5Pool = null;

/**
 * Connection pool for THIS application's own database (PublisherOperations).
 * Full read/write access.
 */
async function getPopPool() {
  if (popPool && popPool.connected) return popPool;

  popPool = await new sql.ConnectionPool({
    server: env.db.server,
    port: env.db.port,
    database: env.db.database,
    user: env.db.user,
    password: env.db.password,
    options: {
      encrypt: env.db.encrypt,
      trustServerCertificate: env.db.trustServerCertificate,
    },
    pool: { max: 20, min: 0, idleTimeoutMillis: 30000 },
  }).connect();

  popPool.on('error', (err) => logger.error('PublisherOperations pool error', { err }));
  logger.info('Connected to PublisherOperations database');
  return popPool;
}

/**
 * Connection pool for PUB5 - READ ONLY.
 * The DB user configured here (PUB5_DB_USER) must be granted SELECT-only
 * permissions at the SQL Server level. This app must never issue
 * INSERT/UPDATE/DELETE/DDL statements against this pool. Enforced again
 * at the repository layer in Phase 2 (queries are hardcoded SELECTs only).
 */
async function getPub5Pool() {
  if (pub5Pool && pub5Pool.connected) return pub5Pool;

  if (!env.pub5Db.server) {
    logger.warn('PUB5 database not configured yet - skipping connection (expected until Phase 2)');
    return null;
  }

  pub5Pool = await new sql.ConnectionPool({
    server: env.pub5Db.server,
    port: env.pub5Db.port,
    database: env.pub5Db.database,
    user: env.pub5Db.user,
    password: env.pub5Db.password,
    options: {
      encrypt: env.pub5Db.encrypt,
      trustServerCertificate: env.pub5Db.trustServerCertificate,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  }).connect();

  pub5Pool.on('error', (err) => logger.error('PUB5 pool error', { err }));
  logger.info('Connected to PUB5 database (read-only)');
  return pub5Pool;
}

async function closeAllPools() {
  if (popPool) await popPool.close();
  if (pub5Pool) await pub5Pool.close();
}

module.exports = { sql, getPopPool, getPub5Pool, closeAllPools };
