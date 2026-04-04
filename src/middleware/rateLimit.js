/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse.
 *
 * All limiters are in one canonical CJS file.
 * When REDIS_URL is available the limiters use Redis-backed storage
 * (distributed across instances); otherwise they fall back to the
 * default in-memory store which is fine for single-process deployments.
 */

const rateLimit = require('express-rate-limit');

let RedisStore;
let redisClient;

try {
  RedisStore = require('rate-limit-redis');
  redisClient = require('../config/redis');
} catch (_) {
  // rate-limit-redis or redis config not available — use in-memory store
}

function makeStore(prefix) {
  if (RedisStore && redisClient) {
    try {
      return new RedisStore({
        // @ts-ignore — known typing gap in rate-limit-redis
        client: redisClient,
        prefix: `ratelimit:${prefix}:`,
        sendCommand: (...args) => redisClient.sendCommand(args)
      });
    } catch (_) {
      // Fall through to in-memory
    }
  }
  return undefined; // express-rate-limit defaults to MemoryStore
}

function standardHandler(message, retryAfter) {
  return (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message,
      retryAfter
    });
  };
}

// General API rate limiter — 100 req / 15 min per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip || req.connection.remoteAddress,
  handler: standardHandler('Too many requests from this IP, please try again after 15 minutes', 900),
  store: makeStore('api')
});

// Authentication endpoints — 5 attempts / 15 min (only counts failures)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: standardHandler('Too many login attempts. Account temporarily locked. Please try again later.', 900),
  store: makeStore('auth')
});

// Project creation — 10 per hour
const createProjectLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: standardHandler('Project creation limit reached. Please try again later.', 3600),
  store: makeStore('project-create')
});

// Metrics endpoint — 10 req / min
const metricsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler('Metrics rate limit exceeded. Please try again later.', 60),
  store: makeStore('metrics')
});

// Health check endpoint — 20 req / min
const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler('Health check rate limit exceeded.', 60),
  store: makeStore('health')
});

// CSRF token endpoint — 30 req / min
const csrfLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler('CSRF token rate limit exceeded. Please try again later.', 60),
  store: makeStore('csrf')
});

// Password reset — 3 per hour
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler('Too many password reset attempts. Please try again later.', 3600),
  store: makeStore('password-reset')
});

// AI / resource-intensive operations — 100 per hour per user
const aiOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: standardHandler('You have reached the hourly limit for AI operations.', 3600),
  store: makeStore('ai-operation')
});

/**
 * Factory — create a custom limiter with Redis backing when available
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests',
    keyPrefix = 'custom',
    keyGenerator = (req) => req.user?.id || req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: standardHandler(message, Math.floor(windowMs / 1000)),
    store: makeStore(keyPrefix)
  });
}

module.exports = {
  apiLimiter,
  authLimiter,
  createProjectLimiter,
  metricsLimiter,
  healthLimiter,
  csrfLimiter,
  passwordResetLimiter,
  aiOperationLimiter,
  createRateLimiter
};
