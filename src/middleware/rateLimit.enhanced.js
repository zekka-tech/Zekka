/**
 * Enhanced Rate Limiting
 * 
 * SECURITY FIX: Phase 1 - Enhanced rate limiting with better configuration
 * SECURITY FIX: Phase 2 - Rate limiting for all endpoints
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Standard error message
 */
function standardMessage(retryAfter) {
  return {
    error: 'Too many requests',
    message: `Too many requests from this IP, please try again after ${retryAfter}`,
    retryAfter: retryAfter
  };
}

/**
 * General API rate limiter
 * SECURITY: 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: standardMessage('15 minutes'),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    });
  }
});

/**
 * Authentication rate limiter
 * SECURITY: 5 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimit.auth.max,
  message: standardMessage('15 minutes'),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Account temporarily locked. Please try again later.',
      retryAfter: 900
    });
  }
});

/**
 * Project creation rate limiter
 * SECURITY: 10 projects per hour
 */
const createProjectLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: config.rateLimit.project.max,
  message: standardMessage('1 hour'),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many projects created',
      message: 'Project creation limit reached. Please try again later.',
      retryAfter: 3600
    });
  }
});

/**
 * Metrics endpoint rate limiter
 * SECURITY FIX: Phase 2 - Rate limit metrics endpoint
 */
const metricsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: standardMessage('1 minute'),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Health check rate limiter
 * SECURITY FIX: Phase 2 - Rate limit health endpoint
 */
const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: standardMessage('1 minute'),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * CSRF token rate limiter
 */
const csrfLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: standardMessage('1 minute'),
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  apiLimiter,
  authLimiter,
  createProjectLimiter,
  metricsLimiter,
  healthLimiter,
  csrfLimiter
};
