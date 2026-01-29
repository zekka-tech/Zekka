/**
 * Database Configuration with Connection Pooling
 *
 * SECURITY FIX: Phase 2 - SQL injection prevention with parameterized queries
 * PERFORMANCE FIX: Phase 3 - Proper connection pooling
 * RELIABILITY FIX: Phase 4 - Reconnection logic and comprehensive error handling
 */

const { Pool } = require('pg');
const config = require('./index');
const logger = require('../utils/logger');

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000; // 5 seconds

// Create connection pool
const pool = new Pool({
  connectionString: config.database.url,
  min: config.database.poolMin || 2,
  max: config.database.poolMax || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: config.isProduction ? { rejectUnauthorized: false } : false,
  // Additional pool configuration
  allowExitOnIdle: false,
  maxUses: 7500,
  application_name: 'zekka-framework',
  // Query timeout
  query_timeout: 30000,
  // Statement timeout
  statement_timeout: 30000
});

// Pool event handlers with reconnection logic
pool.on('connect', (client) => {
  logger.info('✅ Database client connected');
  reconnectAttempts = 0; // Reset counter on successful connection

  // Set timezone for all connections
  client.query('SET timezone = "UTC"').catch((err) => {
    logger.error('❌ Error setting timezone:', err);
  });
});

pool.on('error', (err, client) => {
  logger.error('❌ Unexpected database pool error:', err);

  // Attempt reconnection for connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    handleReconnection();
  }
});

pool.on('acquire', () => {
  // Client acquired from pool - useful for monitoring
  // logger.info('Client acquired from pool');
});

pool.on('remove', () => {
  // Client removed from pool - useful for monitoring
  // logger.info('Client removed from pool');
});

/**
 * Handle database reconnection
 */
async function handleReconnection() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    logger.error(
      `❌ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`
    );
    return;
  }

  reconnectAttempts++;
  logger.info(
    `🔄 Attempting to reconnect to database (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
  );

  setTimeout(async () => {
    try {
      await testConnection();
      logger.info('✅ Database reconnection successful');
      reconnectAttempts = 0;
    } catch (error) {
      logger.error(
        `❌ Reconnection attempt ${reconnectAttempts} failed:`,
        error.message
      );
      handleReconnection();
    }
  }, RECONNECT_DELAY);
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ Database connection test successful');
    return true;
  } catch (error) {
    logger.error('❌ Database connection test failed:', error);
    throw error;
  }
}

/**
 * Get pool statistics
 */
function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  };
}

/**
 * Close all connections
 */
async function closePool() {
  await pool.end();
  logger.info('✅ Database pool closed');
}

/**
 * Health check query
 */
async function healthCheck() {
  try {
    const result = await pool.query('SELECT 1 as health');
    return result.rows[0].health === 1;
  } catch (error) {
    logger.error('❌ Database health check failed:', error);
    return false;
  }
}

/**
 * Execute query with automatic retry on transient failures
 */
async function queryWithRetry(text, params, retries = 3) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      return await pool.query(text, params);
    } catch (error) {
      lastError = error;

      // Retry only on transient errors
      const transientErrors = [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ECONNRESET',
        '57P03'
      ];
      const isTransient = transientErrors.some(
        (code) => error.code === code || error.message.includes(code)
      );

      if (!isTransient || i === retries - 1) {
        throw error;
      }

      logger.warn(
        `⚠️  Query failed (attempt ${i + 1}/${retries}), retrying...`,
        error.message
      );
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }

  throw lastError;
}

/**
 * Execute transaction with automatic rollback on error
 */
async function transaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if table exists
 */
async function tableExists(tableName) {
  try {
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      )`,
      [tableName]
    );
    return result.rows[0].exists;
  } catch (error) {
    logger.error(`❌ Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Get database version
 */
async function getDatabaseVersion() {
  try {
    const result = await pool.query('SELECT version()');
    return result.rows[0].version;
  } catch (error) {
    logger.error('❌ Error getting database version:', error);
    return null;
  }
}

/**
 * Get detailed pool statistics
 */
function getDetailedPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    max: pool.options.max,
    min: pool.options.min,
    connectionTimeoutMillis: pool.options.connectionTimeoutMillis,
    idleTimeoutMillis: pool.options.idleTimeoutMillis
  };
}

// Convenience wrapper to use pool.query directly
const query = (text, values) => pool.query(text, values);
const getClient = () => pool.connect();

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  getPoolStats,
  getDetailedPoolStats,
  closePool,
  healthCheck,
  queryWithRetry,
  transaction,
  tableExists,
  getDatabaseVersion
};
