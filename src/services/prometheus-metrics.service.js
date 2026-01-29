/**
 * Prometheus Metrics Collection Service
 * Enterprise-grade monitoring with comprehensive metrics collection
 *
 * Features:
 * - HTTP request metrics (duration, status, method)
 * - System metrics (CPU, memory, event loop lag)
 * - Database connection pool metrics
 * - Redis cache metrics
 * - Custom business metrics
 * - Automatic metric aggregation
 * - Prometheus-compatible exposition format
 *
 * @version 1.0.0
 * @module services/prometheus-metrics
 */

const promClient = require('prom-client');
const os = require('os');

class PrometheusMetricsService {
  constructor() {
    // Create registry
    this.register = new promClient.Registry();

    // Add default labels
    this.register.setDefaultLabels({
      app: 'zekka-framework',
      version: '3.0.0',
      environment: process.env.NODE_ENV || 'development'
    });

    // Initialize metrics
    this.initializeMetrics();

    // Collect default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({
      register: this.register,
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
    });
  }

  /**
   * Initialize all custom metrics
   */
  initializeMetrics() {
    // ========================================================================
    // HTTP Metrics
    // ========================================================================

    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register]
    });

    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register]
    });

    this.httpRequestSize = new promClient.Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.register]
    });

    this.httpResponseSize = new promClient.Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.register]
    });

    // ========================================================================
    // Authentication & Security Metrics
    // ========================================================================

    this.authAttempts = new promClient.Counter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['result', 'type'], // result: success/failure, type: password/mfa/token
      registers: [this.register]
    });

    this.mfaVerifications = new promClient.Counter({
      name: 'mfa_verifications_total',
      help: 'Total number of MFA verification attempts',
      labelNames: ['result'],
      registers: [this.register]
    });

    this.securityEvents = new promClient.Counter({
      name: 'security_events_total',
      help: 'Total number of security events',
      labelNames: ['severity', 'type'],
      registers: [this.register]
    });

    this.failedLoginAttempts = new promClient.Counter({
      name: 'failed_login_attempts_total',
      help: 'Total number of failed login attempts',
      labelNames: ['reason'], // reason: wrong_password/account_locked/mfa_failed
      registers: [this.register]
    });

    // ========================================================================
    // Database Metrics
    // ========================================================================

    this.dbQueryDuration = new promClient.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register]
    });

    this.dbQueryTotal = new promClient.Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table', 'result'],
      registers: [this.register]
    });

    this.dbConnectionPool = new promClient.Gauge({
      name: 'db_connection_pool_size',
      help: 'Current size of database connection pool',
      labelNames: ['state'], // state: idle/active/waiting
      registers: [this.register]
    });

    this.dbTransactionDuration = new promClient.Histogram({
      name: 'db_transaction_duration_seconds',
      help: 'Duration of database transactions in seconds',
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register]
    });

    // ========================================================================
    // Redis Cache Metrics
    // ========================================================================

    this.cacheHits = new promClient.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_name'],
      registers: [this.register]
    });

    this.cacheMisses = new promClient.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_name'],
      registers: [this.register]
    });

    this.cacheOperationDuration = new promClient.Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Duration of cache operations in seconds',
      labelNames: ['operation'], // operation: get/set/delete
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
      registers: [this.register]
    });

    this.cacheSize = new promClient.Gauge({
      name: 'cache_entries_total',
      help: 'Total number of entries in cache',
      labelNames: ['cache_name'],
      registers: [this.register]
    });

    // ========================================================================
    // Business Metrics
    // ========================================================================

    this.activeUsers = new promClient.Gauge({
      name: 'active_users_total',
      help: 'Total number of active users',
      registers: [this.register]
    });

    this.activeSessions = new promClient.Gauge({
      name: 'active_sessions_total',
      help: 'Total number of active sessions',
      registers: [this.register]
    });

    this.apiCallsTotal = new promClient.Counter({
      name: 'api_calls_total',
      help: 'Total number of API calls to external services',
      labelNames: ['service', 'result'],
      registers: [this.register]
    });

    this.apiCallDuration = new promClient.Histogram({
      name: 'api_call_duration_seconds',
      help: 'Duration of API calls to external services',
      labelNames: ['service'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.register]
    });

    this.circuitBreakerState = new promClient.Gauge({
      name: 'circuit_breaker_state',
      help: 'Current state of circuit breakers (0=closed, 1=open, 2=half-open)',
      labelNames: ['service'],
      registers: [this.register]
    });

    // ========================================================================
    // Rate Limiting Metrics
    // ========================================================================

    this.rateLimitExceeded = new promClient.Counter({
      name: 'rate_limit_exceeded_total',
      help: 'Total number of rate limit exceeded events',
      labelNames: ['endpoint', 'user_id'],
      registers: [this.register]
    });

    this.rateLimitRemaining = new promClient.Gauge({
      name: 'rate_limit_remaining',
      help: 'Remaining rate limit for endpoints',
      labelNames: ['endpoint', 'user_id'],
      registers: [this.register]
    });

    // ========================================================================
    // Migration Metrics
    // ========================================================================

    this.migrations = new promClient.Gauge({
      name: 'migrations_executed_total',
      help: 'Total number of executed migrations',
      registers: [this.register]
    });

    this.migrationDuration = new promClient.Histogram({
      name: 'migration_duration_seconds',
      help: 'Duration of database migrations',
      buckets: [1, 5, 10, 30, 60, 120, 300],
      registers: [this.register]
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method,
    route,
    statusCode,
    durationMs,
    requestSize,
    responseSize
  ) {
    this.httpRequestDuration
      .labels(method, route, statusCode)
      .observe(durationMs / 1000);
    this.httpRequestTotal.labels(method, route, statusCode).inc();

    if (requestSize) {
      this.httpRequestSize.labels(method, route).observe(requestSize);
    }

    if (responseSize) {
      this.httpResponseSize.labels(method, route).observe(responseSize);
    }
  }

  /**
   * Record authentication attempt
   */
  recordAuthAttempt(result, type = 'password') {
    this.authAttempts.labels(result, type).inc();
  }

  /**
   * Record MFA verification
   */
  recordMFAVerification(result) {
    this.mfaVerifications.labels(result).inc();
  }

  /**
   * Record security event
   */
  recordSecurityEvent(severity, type) {
    this.securityEvents.labels(severity, type).inc();
  }

  /**
   * Record failed login attempt
   */
  recordFailedLogin(reason) {
    this.failedLoginAttempts.labels(reason).inc();
  }

  /**
   * Record database query
   */
  recordDbQuery(operation, table, result, durationMs) {
    this.dbQueryDuration.labels(operation, table).observe(durationMs / 1000);
    this.dbQueryTotal.labels(operation, table, result).inc();
  }

  /**
   * Update database connection pool metrics
   */
  updateDbConnectionPool(idle, active, waiting) {
    this.dbConnectionPool.labels('idle').set(idle);
    this.dbConnectionPool.labels('active').set(active);
    this.dbConnectionPool.labels('waiting').set(waiting);
  }

  /**
   * Record database transaction
   */
  recordDbTransaction(durationMs) {
    this.dbTransactionDuration.observe(durationMs / 1000);
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheName = 'default') {
    this.cacheHits.labels(cacheName).inc();
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(cacheName = 'default') {
    this.cacheMisses.labels(cacheName).inc();
  }

  /**
   * Record cache operation
   */
  recordCacheOperation(operation, durationMs) {
    this.cacheOperationDuration.labels(operation).observe(durationMs / 1000);
  }

  /**
   * Update cache size
   */
  updateCacheSize(size, cacheName = 'default') {
    this.cacheSize.labels(cacheName).set(size);
  }

  /**
   * Update active users count
   */
  updateActiveUsers(count) {
    this.activeUsers.set(count);
  }

  /**
   * Update active sessions count
   */
  updateActiveSessions(count) {
    this.activeSessions.set(count);
  }

  /**
   * Record API call
   */
  recordApiCall(service, result, durationMs) {
    this.apiCallsTotal.labels(service, result).inc();
    this.apiCallDuration.labels(service).observe(durationMs / 1000);
  }

  /**
   * Update circuit breaker state
   */
  updateCircuitBreakerState(service, state) {
    // 0 = closed, 1 = open, 2 = half-open
    const stateValue = { closed: 0, open: 1, 'half-open': 2 }[state] || 0;
    this.circuitBreakerState.labels(service).set(stateValue);
  }

  /**
   * Record rate limit exceeded
   */
  recordRateLimitExceeded(endpoint, userId) {
    this.rateLimitExceeded.labels(endpoint, userId || 'anonymous').inc();
  }

  /**
   * Update rate limit remaining
   */
  updateRateLimitRemaining(endpoint, userId, remaining) {
    this.rateLimitRemaining
      .labels(endpoint, userId || 'anonymous')
      .set(remaining);
  }

  /**
   * Update migrations count
   */
  updateMigrationsCount(count) {
    this.migrations.set(count);
  }

  /**
   * Record migration duration
   */
  recordMigrationDuration(durationMs) {
    this.migrationDuration.observe(durationMs / 1000);
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics() {
    return await this.register.metrics();
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsAsJson() {
    const metrics = await this.register.getMetricsAsJSON();
    return metrics;
  }

  /**
   * Calculate cache hit rate
   */
  async getCacheHitRate() {
    const metrics = await this.getMetricsAsJson();
    const hits = metrics.find((m) => m.name === 'cache_hits_total');
    const misses = metrics.find((m) => m.name === 'cache_misses_total');

    if (!hits || !misses) return 0;

    const totalHits = hits.values.reduce((sum, v) => sum + v.value, 0);
    const totalMisses = misses.values.reduce((sum, v) => sum + v.value, 0);
    const total = totalHits + totalMisses;

    return total > 0 ? (totalHits / total) * 100 : 0;
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      cpu: {
        count: cpus.length,
        model: cpus[0]?.model,
        load: os.loadavg()
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        usage_percent: (usedMemory / totalMemory) * 100
      },
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch()
    };
  }

  /**
   * Reset all metrics (use with caution)
   */
  reset() {
    this.register.clear();
    this.initializeMetrics();
  }
}

// Export singleton instance
module.exports = new PrometheusMetricsService();
