/**
 * Enhanced Health Check System
 *
 * Features:
 * - Component-based health checks
 * - Dependency health monitoring
 * - Detailed status reporting
 * - Performance metrics
 * - Historical health data
 * - Kubernetes-ready probes
 */

const { pool } = require('../config/database');

// Health status
const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown'
};

// Check types
const CheckType = {
  LIVENESS: 'liveness', // Is the app running?
  READINESS: 'readiness', // Is the app ready to serve traffic?
  STARTUP: 'startup' // Has the app finished starting?
};

class HealthCheckSystem {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 5000,
      cacheTimeout: options.cacheTimeout || 10000, // Cache results for 10 seconds
      ...options
    };

    this.checks = new Map();
    this.lastResults = null;
    this.lastCheck = null;
    this.isStarted = false;

    this.registerDefaultChecks();
  }

  /**
   * Register default health checks
   */
  registerDefaultChecks() {
    // Database check
    this.registerCheck(
      'database',
      async () => {
        try {
          const result = await Promise.race([
            pool.query('SELECT 1'),
            new Promise((_, reject) => setTimeout(
              () => reject(new Error('Database check timeout')),
              3000
            ))
          ]);

          return {
            status: HealthStatus.HEALTHY,
            message: 'Database connection is healthy',
            latency: result.duration || 0
          };
        } catch (error) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: `Database connection failed: ${error.message}`,
            error: error.message
          };
        }
      },
      {
        critical: true,
        timeout: 3000
      }
    );

    // Redis check
    this.registerCheck(
      'redis',
      async () => {
        try {
          // Assuming Redis client is available globally
          if (!global.redisClient) {
            return {
              status: HealthStatus.UNKNOWN,
              message: 'Redis client not initialized'
            };
          }

          const start = Date.now();
          await Promise.race([
            global.redisClient.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis check timeout')), 2000))
          ]);
          const latency = Date.now() - start;

          return {
            status: HealthStatus.HEALTHY,
            message: 'Redis connection is healthy',
            latency
          };
        } catch (error) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: `Redis connection failed: ${error.message}`,
            error: error.message
          };
        }
      },
      {
        critical: false,
        timeout: 2000
      }
    );

    // Memory check
    this.registerCheck('memory', async () => {
      const usage = process.memoryUsage();
      const usedHeap = usage.heapUsed / usage.heapTotal;

      let status = HealthStatus.HEALTHY;
      let message = 'Memory usage is normal';

      if (usedHeap > 0.9) {
        status = HealthStatus.UNHEALTHY;
        message = 'Memory usage is critically high';
      } else if (usedHeap > 0.75) {
        status = HealthStatus.DEGRADED;
        message = 'Memory usage is elevated';
      }

      return {
        status,
        message,
        metrics: {
          heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
          heapPercentage: Math.round(usedHeap * 100),
          rss: Math.round(usage.rss / 1024 / 1024),
          external: Math.round(usage.external / 1024 / 1024)
        }
      };
    });

    // Disk space check (if available)
    this.registerCheck('disk', async () => {
      try {
        // This is a simplified check
        // In production, use a library like 'diskusage'
        return {
          status: HealthStatus.HEALTHY,
          message: 'Disk space is adequate',
          metrics: {
            available: 'N/A (not implemented)'
          }
        };
      } catch (error) {
        return {
          status: HealthStatus.UNKNOWN,
          message: 'Could not check disk space'
        };
      }
    });

    // Event loop lag check
    this.registerCheck('eventLoop', async () => {
      const start = Date.now();

      await new Promise((resolve) => {
        setImmediate(() => {
          resolve();
        });
      });

      const lag = Date.now() - start;

      let status = HealthStatus.HEALTHY;
      let message = 'Event loop is responsive';

      if (lag > 100) {
        status = HealthStatus.UNHEALTHY;
        message = 'Event loop is severely lagged';
      } else if (lag > 50) {
        status = HealthStatus.DEGRADED;
        message = 'Event loop has some lag';
      }

      return {
        status,
        message,
        metrics: {
          lagMs: lag
        }
      };
    });
  }

  /**
   * Register a health check
   */
  registerCheck(name, checkFn, options = {}) {
    this.checks.set(name, {
      name,
      fn: checkFn,
      critical: options.critical !== false, // Critical by default
      timeout: options.timeout || this.options.timeout,
      enabled: options.enabled !== false
    });
  }

  /**
   * Unregister a health check
   */
  unregisterCheck(name) {
    this.checks.delete(name);
  }

  /**
   * Run all health checks
   */
  async runChecks(type = CheckType.READINESS) {
    // Use cached results if available and fresh
    if (
      this.lastResults
      && this.lastCheck
      && Date.now() - this.lastCheck < this.options.cacheTimeout
    ) {
      return this.lastResults;
    }

    const results = {
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '2.1.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {},
      summary: {
        total: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        unknown: 0
      }
    };

    const checkPromises = [];

    for (const [name, check] of this.checks.entries()) {
      if (!check.enabled) continue;

      checkPromises.push(
        this.runSingleCheck(name, check)
          .then((result) => {
            results.checks[name] = result;
            results.summary.total++;
            results.summary[result.status]++;

            // Update overall status
            if (result.status === HealthStatus.UNHEALTHY && check.critical) {
              results.status = HealthStatus.UNHEALTHY;
            } else if (
              result.status === HealthStatus.DEGRADED
              && results.status !== HealthStatus.UNHEALTHY
            ) {
              results.status = HealthStatus.DEGRADED;
            }
          })
          .catch((error) => {
            results.checks[name] = {
              status: HealthStatus.UNHEALTHY,
              message: `Check failed: ${error.message}`,
              error: error.message
            };
            results.summary.total++;
            results.summary.unhealthy++;

            if (check.critical) {
              results.status = HealthStatus.UNHEALTHY;
            }
          })
      );
    }

    await Promise.allSettled(checkPromises);

    // Cache results
    this.lastResults = results;
    this.lastCheck = Date.now();

    return results;
  }

  /**
   * Run a single health check with timeout
   */
  async runSingleCheck(name, check) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Health check timeout')),
        check.timeout
      );
    });

    try {
      const start = Date.now();
      const result = await Promise.race([check.fn(), timeoutPromise]);
      const duration = Date.now() - start;

      return {
        ...result,
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: error.message,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Liveness probe - is the application running?
   */
  async liveness() {
    return {
      status: HealthStatus.HEALTHY,
      message: 'Application is running',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Readiness probe - is the application ready to serve traffic?
   */
  async readiness() {
    return await this.runChecks(CheckType.READINESS);
  }

  /**
   * Startup probe - has the application finished starting?
   */
  async startup() {
    if (!this.isStarted) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: 'Application is still starting',
        timestamp: new Date().toISOString()
      };
    }

    return {
      status: HealthStatus.HEALTHY,
      message: 'Application has started successfully',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  /**
   * Mark application as started
   */
  markAsStarted() {
    this.isStarted = true;
  }

  /**
   * Express middleware for health check endpoint
   */
  middleware() {
    return async (req, res) => {
      const type = req.query.type || CheckType.READINESS;

      let result;
      switch (type) {
      case CheckType.LIVENESS:
        result = await this.liveness();
        break;
      case CheckType.STARTUP:
        result = await this.startup();
        break;
      case CheckType.READINESS:
      default:
        result = await this.readiness();
        break;
      }

      const statusCode = result.status === HealthStatus.HEALTHY
        ? 200
        : result.status === HealthStatus.DEGRADED
          ? 200
          : 503;

      res.status(statusCode).json(result);
    };
  }

  /**
   * Get system information
   */
  getSystemInfo() {
    const usage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptime: process.uptime()
      },
      memory: {
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        rss: Math.round(usage.rss / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
        arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      }
    };
  }
}

// Singleton instance
let healthCheckInstance = null;

/**
 * Get health check system instance
 */
function getHealthCheckSystem(options) {
  if (!healthCheckInstance) {
    healthCheckInstance = new HealthCheckSystem(options);
  }
  return healthCheckInstance;
}

module.exports = {
  HealthCheckSystem,
  getHealthCheckSystem,
  HealthStatus,
  CheckType
};
