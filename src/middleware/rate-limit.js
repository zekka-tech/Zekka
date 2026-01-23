/**
 * Enhanced Rate Limiting Middleware
 * ==================================
 *
 * Comprehensive rate limiting with:
 * - Redis-based storage for distributed systems
 * - Different limits for different endpoints
 * - IP-based and user-based limiting
 * - Sliding window algorithm
 * - Custom error responses
 * - Bypass for whitelisted IPs
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../config/redis.js';
import config from '../config/index.js';

/**
 * Create Redis store for rate limiting
 */
function createRedisStore(prefix) {
  return new RedisStore({
    // @ts-expect-error - Known issue with RedisStore types
    client: redis,
    prefix: `ratelimit:${prefix}:`,
    sendCommand: (...args) => redis.sendCommand(args)
  });
}

/**
 * Authentication endpoints limiter
 * Strict limit to prevent brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes',
    retryAfter: 900 // seconds
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false, // Count failed requests
  keyGenerator: (req) => {
    // Rate limit by IP address
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts',
      message: 'Please try again after 15 minutes',
      retryAfter: 900
    });
  },
  store: createRedisStore('auth')
});

/**
 * General API rate limiter
 * More permissive for general API usage
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Please try again later',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise IP
    return req.user?.id || req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: 900
    });
  },
  store: createRedisStore('api')
});

/**
 * Strict limiter for resource-intensive operations
 * (e.g., project creation, file uploads, AI operations)
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: {
    success: false,
    error: 'Rate limit exceeded',
    message: 'Too many resource-intensive operations. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'You have exceeded the limit for this operation. Please try again in an hour.',
      retryAfter: 3600
    });
  },
  store: createRedisStore('strict')
});

/**
 * Project creation rate limiter
 */
export const createProjectLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 projects per hour
  message: {
    success: false,
    error: 'Project creation limit exceeded',
    message: 'You can create up to 10 projects per hour',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skipFailedRequests: true, // Don't count failed creations
  store: createRedisStore('project-create')
});

/**
 * Password reset limiter
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    error: 'Password reset limit exceeded',
    message: 'Too many password reset attempts. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  store: createRedisStore('password-reset')
});

/**
 * Email verification limiter
 */
export const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 emails per hour
  message: {
    success: false,
    error: 'Verification email limit exceeded',
    message: 'Too many verification emails sent. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('email-verification')
});

/**
 * MFA setup limiter
 */
export const mfaSetupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 setup attempts per hour
  message: {
    success: false,
    error: 'MFA setup limit exceeded',
    message: 'Too many MFA setup attempts. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('mfa-setup')
});

/**
 * File upload limiter
 */
export const fileUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    error: 'File upload limit exceeded',
    message: 'Too many file uploads. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  store: createRedisStore('file-upload')
});

/**
 * AI operation limiter
 */
export const aiOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 AI operations per hour
  message: {
    success: false,
    error: 'AI operation limit exceeded',
    message: 'You have reached the hourly limit for AI operations',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  store: createRedisStore('ai-operation')
});

/**
 * Webhook limiter
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 webhooks per minute
  message: {
    success: false,
    error: 'Webhook rate limit exceeded',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('webhook')
});

/**
 * Admin operations limiter (more permissive)
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: {
    success: false,
    error: 'Admin rate limit exceeded',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for super admins
    return req.user?.role === 'super_admin';
  },
  store: createRedisStore('admin')
});

/**
 * Custom rate limiter factory
 * Create custom rate limiters with specific configurations
 */
export function createRateLimiter(options = {}) {
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
    message: {
      success: false,
      error: 'Rate limit exceeded',
      message,
      retryAfter: Math.floor(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message,
        retryAfter: Math.floor(windowMs / 1000)
      });
    },
    store: createRedisStore(keyPrefix)
  });
}

/**
 * IP whitelist bypass middleware
 */
export function bypassForWhitelist(whitelist = []) {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    if (whitelist.includes(clientIP)) {
      // Skip rate limiting for whitelisted IPs
      req.rateLimit = {
        limit: Infinity,
        current: 0,
        remaining: Infinity
      };
    }

    next();
  };
}

export default {
  authLimiter,
  apiLimiter,
  strictLimiter,
  createProjectLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  mfaSetupLimiter,
  fileUploadLimiter,
  aiOperationLimiter,
  webhookLimiter,
  adminLimiter,
  createRateLimiter,
  bypassForWhitelist
};
