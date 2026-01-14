/**
 * Database Configuration with Connection Pooling
 * 
 * SECURITY FIX: Phase 2 - SQL injection prevention with parameterized queries
 * PERFORMANCE FIX: Phase 3 - Proper connection pooling
 */

const { Pool } = require('pg');
const config = require('./index');

// Create connection pool
const pool = new Pool({
  connectionString: config.database.url,
  min: config.database.poolMin,
  max: config.database.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: config.isProduction ? { rejectUnauthorized: false } : false,
  // Additional pool configuration
  allowExitOnIdle: false,
  maxUses: 7500,
  application_name: 'zekka-framework'
});

// Pool event handlers
pool.on('connect', (client) => {
  console.log('✅ Database client connected');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected database pool error:', err);
});

pool.on('acquire', () => {
  // Client acquired from pool
});

pool.on('remove', () => {
  // Client removed from pool
});

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
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
  console.log('✅ Database pool closed');
}

/**
 * Health check query
 */
async function healthCheck() {
  try {
    const result = await pool.query('SELECT 1 as health');
    return result.rows[0].health === 1;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  getPoolStats,
  closePool,
  healthCheck
};
