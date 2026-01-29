/**
 * Advanced Prometheus Metrics Configuration
 *
 * Features:
 * - Custom business metrics
 * - Histogram for latency tracking
 * - Gauge for resource monitoring
 * - Counter for event tracking
 * - Summary for percentiles
 */

const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({ register });

// ============================================================================
// HTTP Metrics
// ============================================================================

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'api_version'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'api_version'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  registers: [register]
});

const httpRequestSize = new client.Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route', 'api_version'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register]
});

const httpResponseSize = new client.Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code', 'api_version'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register]
});

// ============================================================================
// Authentication Metrics
// ============================================================================

const authAttemptsTotal = new client.Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['status', 'reason'],
  registers: [register]
});

const authFailuresTotal = new client.Counter({
  name: 'auth_failures_total',
  help: 'Total number of authentication failures',
  labelNames: ['reason'],
  registers: [register]
});

const activeSessionsGauge = new client.Gauge({
  name: 'active_sessions',
  help: 'Number of active user sessions',
  registers: [register]
});

const sessionDuration = new client.Histogram({
  name: 'session_duration_seconds',
  help: 'Duration of user sessions in seconds',
  buckets: [60, 300, 600, 1800, 3600, 7200, 14400, 28800, 86400],
  registers: [register]
});

// ============================================================================
// Database Metrics
// ============================================================================

const dbQueriesTotal = new client.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
  registers: [register]
});

const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register]
});

const dbConnectionsActive = new client.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [register]
});

const dbConnectionsIdle = new client.Gauge({
  name: 'db_connections_idle',
  help: 'Number of idle database connections',
  registers: [register]
});

const dbConnectionErrors = new client.Counter({
  name: 'db_connection_errors_total',
  help: 'Total number of database connection errors',
  labelNames: ['error_type'],
  registers: [register]
});

// ============================================================================
// Security Metrics
// ============================================================================

const securityEventsTotal = new client.Counter({
  name: 'security_events_total',
  help: 'Total number of security events',
  labelNames: ['type', 'severity'],
  registers: [register]
});

const securityAlertsTotal = new client.Counter({
  name: 'security_alerts_total',
  help: 'Total number of security alerts',
  labelNames: ['alert_type', 'severity'],
  registers: [register]
});

const rateLimitHits = new client.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'ip'],
  registers: [register]
});

const csrfViolations = new client.Counter({
  name: 'csrf_violations_total',
  help: 'Total number of CSRF violations',
  registers: [register]
});

const accountLockouts = new client.Counter({
  name: 'account_lockouts_total',
  help: 'Total number of account lockouts',
  registers: [register]
});

// ============================================================================
// Business Metrics
// ============================================================================

const usersTotal = new client.Gauge({
  name: 'users_total',
  help: 'Total number of users',
  labelNames: ['status'],
  registers: [register]
});

const projectsTotal = new client.Gauge({
  name: 'projects_total',
  help: 'Total number of projects',
  labelNames: ['status'],
  registers: [register]
});

const projectExecutionDuration = new client.Histogram({
  name: 'project_execution_duration_seconds',
  help: 'Duration of project executions',
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600],
  registers: [register]
});

const apiCallsTotal = new client.Counter({
  name: 'api_calls_total',
  help: 'Total number of API calls',
  labelNames: ['service', 'operation', 'status'],
  registers: [register]
});

// ============================================================================
// Error Metrics
// ============================================================================

const errorsTotal = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['error_code', 'category', 'severity'],
  registers: [register]
});

const errorRate = new client.Gauge({
  name: 'error_rate',
  help: 'Error rate per minute',
  registers: [register]
});

// ============================================================================
// Cache Metrics (for future use)
// ============================================================================

const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_name'],
  registers: [register]
});

const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_name'],
  registers: [register]
});

// ============================================================================
// Circuit Breaker Metrics
// ============================================================================

const circuitBreakerState = new client.Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['service'],
  registers: [register]
});

const circuitBreakerFailures = new client.Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total number of circuit breaker failures',
  labelNames: ['service'],
  registers: [register]
});

// ============================================================================
// Middleware for automatic metrics collection
// ============================================================================

function metricsMiddleware(req, res, next) {
  const start = Date.now();
  const requestSize = parseInt(req.get('content-length') || 0);

  // Track request size
  if (requestSize > 0) {
    httpRequestSize.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
        api_version: req.apiVersion || 'unknown'
      },
      requestSize
    );
  }

  // Capture the original end function
  const originalEnd = res.end;

  // Override end function to capture response metrics
  res.end = function (...args) {
    const duration = (Date.now() - start) / 1000;
    const responseSize = parseInt(res.get('content-length') || 0);

    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
      api_version: req.apiVersion || 'unknown'
    };

    // Record metrics
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);

    if (responseSize > 0) {
      httpResponseSize.observe(labels, responseSize);
    }

    // Call original end
    return originalEnd.apply(this, args);
  };

  next();
}

// ============================================================================
// Helper functions to record metrics
// ============================================================================

const metrics = {
  // HTTP
  recordHttpRequest: (
    method,
    route,
    statusCode,
    duration,
    apiVersion = 'v1'
  ) => {
    const labels = {
      method,
      route,
      status_code: statusCode,
      api_version: apiVersion
    };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  },

  // Authentication
  recordAuthAttempt: (status, reason = 'none') => {
    authAttemptsTotal.inc({ status, reason });
    if (status === 'failure') {
      authFailuresTotal.inc({ reason });
    }
  },

  setActiveSessions: (count) => {
    activeSessionsGauge.set(count);
  },

  recordSessionDuration: (duration) => {
    sessionDuration.observe(duration);
  },

  // Database
  recordDbQuery: (operation, table, status, duration) => {
    dbQueriesTotal.inc({ operation, table, status });
    dbQueryDuration.observe({ operation, table }, duration);
  },

  setDbConnections: (active, idle) => {
    dbConnectionsActive.set(active);
    dbConnectionsIdle.set(idle);
  },

  recordDbError: (errorType) => {
    dbConnectionErrors.inc({ error_type: errorType });
  },

  // Security
  recordSecurityEvent: (type, severity) => {
    securityEventsTotal.inc({ type, severity });
  },

  recordSecurityAlert: (alertType, severity) => {
    securityAlertsTotal.inc({ alert_type: alertType, severity });
  },

  recordRateLimitHit: (endpoint, ip) => {
    rateLimitHits.inc({ endpoint, ip });
  },

  recordCsrfViolation: () => {
    csrfViolations.inc();
  },

  recordAccountLockout: () => {
    accountLockouts.inc();
  },

  // Business
  setUsersCount: (total, active) => {
    usersTotal.set({ status: 'total' }, total);
    usersTotal.set({ status: 'active' }, active);
  },

  setProjectsCount: (total, active, completed) => {
    projectsTotal.set({ status: 'total' }, total);
    projectsTotal.set({ status: 'active' }, active);
    projectsTotal.set({ status: 'completed' }, completed);
  },

  recordProjectExecution: (duration) => {
    projectExecutionDuration.observe(duration);
  },

  recordApiCall: (service, operation, status) => {
    apiCallsTotal.inc({ service, operation, status });
  },

  // Errors
  recordError: (errorCode, category, severity) => {
    errorsTotal.inc({ error_code: errorCode, category, severity });
  },

  setErrorRate: (rate) => {
    errorRate.set(rate);
  },

  // Cache
  recordCacheHit: (cacheName) => {
    cacheHits.inc({ cache_name: cacheName });
  },

  recordCacheMiss: (cacheName) => {
    cacheMisses.inc({ cache_name: cacheName });
  },

  // Circuit Breaker
  setCircuitBreakerState: (service, state) => {
    // 0=closed, 1=open, 2=half-open
    circuitBreakerState.set({ service }, state);
  },

  recordCircuitBreakerFailure: (service) => {
    circuitBreakerFailures.inc({ service });
  }
};

// ============================================================================
// Metrics endpoint
// ============================================================================

async function getMetrics() {
  return register.metrics();
}

async function getMetricsContentType() {
  return register.contentType;
}

module.exports = {
  register,
  metrics,
  metricsMiddleware,
  getMetrics,
  getMetricsContentType
};
