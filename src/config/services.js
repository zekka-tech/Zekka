/**
 * Service Layer Configuration
 * Dependency injection setup for all services
 *
 * @version 1.0.0
 * @module config/services
 */

const { Pool } = require('pg');
const Redis = require('redis');
const DIContainer = require('../utils/di-container');
const logger = require('../utils/logger');

/**
 * Configure and register all services
 */
async function configureServices() {
  logger.info('\n🚀 Configuring services with dependency injection...\n');

  // ============================================================================
  // Infrastructure Services
  // ============================================================================

  // Database Pool
  DIContainer.registerValue('dbConfig', {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'zekka',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    max: parseInt(process.env.DB_POOL_SIZE || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  DIContainer.registerSingleton(
    'database',
    (config) => {
      const pool = new Pool(config);

      pool.on('error', (err) => {
        logger.error('❌ Unexpected database error:', err);
      });

      pool.on('connect', () => {
        logger.info('✅ Database connection established');
      });

      return pool;
    },
    ['dbConfig']
  );

  // Redis Client
  DIContainer.registerValue('redisConfig', {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0')
  });

  DIContainer.registerSingleton(
    'redis',
    (config) => {
      const client = Redis.createClient({
        socket: {
          host: config.host,
          port: config.port
        },
        password: config.password,
        database: config.db
      });

      client.on('error', (err) => {
        logger.error('❌ Redis error:', err);
      });

      client.on('connect', () => {
        logger.info('✅ Redis connection established');
      });

      return client;
    },
    ['redisConfig']
  );

  // Prometheus Metrics
  DIContainer.registerSingleton('metricsService', () => require('../services/prometheus-metrics.service'));

  // ============================================================================
  // Core Services
  // ============================================================================

  // Password Service
  DIContainer.registerSingleton(
    'passwordService',
    (pool) => {
      const PasswordService = require('../services/password-service');
      return new PasswordService(pool);
    },
    ['database']
  );

  // Encryption Service
  DIContainer.registerSingleton(
    'encryptionService',
    (pool) => {
      const EncryptionService = require('../services/encryption-service');
      return new EncryptionService(pool);
    },
    ['database']
  );

  // Audit Service
  DIContainer.registerSingleton(
    'auditService',
    (pool) => {
      const AuditService = require('../services/audit-service');
      return new AuditService(pool);
    },
    ['database']
  );

  // Auth Service
  DIContainer.registerSingleton(
    'authService',
    (pool, redis, passwordService, auditService) => {
      const AuthService = require('../services/auth-service');
      return new AuthService(pool, redis, { passwordService, auditService });
    },
    ['database', 'redis', 'passwordService', 'auditService']
  );

  // Security Monitor
  DIContainer.registerSingleton(
    'securityMonitor',
    (pool, redis, auditService) => {
      const SecurityMonitor = require('../services/security-monitor');
      return new SecurityMonitor(pool, redis, { auditService });
    },
    ['database', 'redis', 'auditService']
  );

  // GDPR Compliance Service
  DIContainer.registerSingleton(
    'gdprService',
    (pool, encryptionService, auditService) => {
      const GDPRService = require('../services/gdpr-compliance.service');
      return new GDPRService(pool, { encryptionService, auditService });
    },
    ['database', 'encryptionService', 'auditService']
  );

  // SOC 2 Compliance Service
  DIContainer.registerSingleton(
    'soc2Service',
    (pool, auditService, securityMonitor) => {
      const SOC2Service = require('../services/soc2-compliance.service');
      return new SOC2Service(pool, { auditService, securityMonitor });
    },
    ['database', 'auditService', 'securityMonitor']
  );

  // Performance Optimization Service
  DIContainer.registerSingleton(
    'performanceService',
    (pool, redis) => {
      const PerformanceService = require('../services/performance-optimization.service');
      return new PerformanceService(pool, redis);
    },
    ['database', 'redis']
  );

  // ============================================================================
  // Initialize Infrastructure Services
  // ============================================================================

  logger.info('📊 Initializing infrastructure services...\n');

  // Connect Redis
  const redis = DIContainer.resolve('redis');
  await redis.connect();

  // Test database connection
  const database = DIContainer.resolve('database');
  await database.query('SELECT NOW()');

  logger.info('\n✅ All services configured and ready\n');
}

/**
 * Get a service from the container
 */
function getService(name) {
  return DIContainer.resolve(name);
}

/**
 * Cleanup all services
 */
async function disposeServices() {
  logger.info('\n🧹 Disposing services...\n');

  // Close Redis connection
  try {
    const redis = DIContainer.resolve('redis');
    await redis.quit();
    logger.info('✅ Redis connection closed');
  } catch (error) {
    logger.error('❌ Error closing Redis:', error.message);
  }

  // Close database pool
  try {
    const pool = DIContainer.resolve('database');
    await pool.end();
    logger.info('✅ Database pool closed');
  } catch (error) {
    logger.error('❌ Error closing database:', error.message);
  }

  // Dispose all services
  await DIContainer.disposeAll();

  logger.info('\n✅ All services disposed\n');
}

/**
 * Get service metadata
 */
function getServiceMetadata() {
  const services = DIContainer.getServiceNames();
  return services.map((name) => DIContainer.getServiceMetadata(name));
}

module.exports = {
  configureServices,
  getService,
  disposeServices,
  getServiceMetadata,
  container: DIContainer
};
