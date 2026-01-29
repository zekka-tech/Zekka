/**
 * Security Middleware
 * ===================
 *
 * Comprehensive security middleware for:
 * - JWT authentication
 * - MFA enforcement
 * - Password expiration checks
 * - Rate limiting
 * - Role-based access control (RBAC)
 * - Security headers
 * - Request validation
 * - Audit logging
 */

import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import redis from '../config/redis.js';
import auditService from '../services/audit-service.js';
import passwordService from '../services/password-service.js';
import logger from '../utils/logger.js';

const { JWT_SECRET } = process.env;

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is required for security middleware'
  );
}

/**
 * Authenticate JWT token
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from database
    const result = await pool.query(
      'SELECT id, email, name, role, is_active, mfa_enabled, force_password_reset FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Require specific role(s)
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!roles.includes(req.user.role)) {
    // Log unauthorized access attempt
    auditService.log({
      userId: req.user.id,
      username: req.user.email,
      action: 'unauthorized_access_attempt',
      resourceType: req.baseUrl,
      endpoint: req.path,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: false,
      errorMessage: `Required role: ${roles.join(' or ')}`,
      riskLevel: 'high'
    });

    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions'
    });
  }

  next();
};

/**
 * Check if password is expired
 */
export const checkPasswordExpiration = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Skip for password change endpoints
    if (
      req.path.includes('/password/change')
      || req.path.includes('/password/reset')
    ) {
      return next();
    }

    const expiration = await passwordService.checkPasswordExpiration(
      req.user.id
    );

    if (expiration.expired) {
      return res.status(403).json({
        success: false,
        error: 'Password has expired',
        message: 'Please change your password to continue',
        passwordExpired: true,
        expirationInfo: expiration
      });
    }

    // Attach warning to response if password expires soon
    if (expiration.warning) {
      res.locals.passwordWarning = {
        message: `Your password will expire in ${expiration.daysUntilExpiration} days`,
        daysUntilExpiration: expiration.daysUntilExpiration
      };
    }

    next();
  } catch (error) {
    logger.error('Password expiration check error:', error);
    // Don't block request on error
    next();
  }
};

/**
 * Check if force password reset is required
 */
export const checkForcePasswordReset = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Skip for password change endpoints
    if (
      req.path.includes('/password/change')
      || req.path.includes('/password/reset')
    ) {
      return next();
    }

    if (req.user.force_password_reset) {
      return res.status(403).json({
        success: false,
        error: 'Password reset required',
        message: 'You must reset your password before continuing',
        forcePasswordReset: true
      });
    }

    next();
  } catch (error) {
    logger.error('Force password reset check error:', error);
    next();
  }
};

/**
 * Rate limiting per user
 */
const rateLimitStore = new Map();

export const rateLimitByUser = (maxRequests = 100, windowMs = 60000) => async (req, res, next) => {
  try {
    const userId = req.user?.id || req.ip;
    const key = `ratelimit:${userId}`;

    // Get current count from Redis
    const count = await redis.get(key);

    if (count && parseInt(count) >= maxRequests) {
      // Log rate limit exceeded
      await auditService.log({
        userId: req.user?.id,
        username: req.user?.email,
        action: 'rate_limit_exceeded',
        endpoint: req.path,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false,
        errorMessage: `Rate limit exceeded: ${maxRequests} requests per ${windowMs}ms`,
        riskLevel: 'medium'
      });

      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Maximum ${maxRequests} requests per ${windowMs / 1000} seconds`,
        retryAfter: windowMs / 1000
      });
    }

    // Increment count
    if (count) {
      await redis.incr(key);
    } else {
      await redis.setex(key, Math.ceil(windowMs / 1000), '1');
    }

    next();
  } catch (error) {
    logger.error('Rate limiting error:', error);
    // Don't block request on error
    next();
  }
};

/**
 * IP-based rate limiting
 */
export const rateLimitByIP = (maxRequests = 100, windowMs = 60000) => async (req, res, next) => {
  try {
    const key = `ratelimit:ip:${req.ip}`;

    const count = await redis.get(key);

    if (count && parseInt(count) >= maxRequests) {
      // Log rate limit exceeded
      await auditService.log({
        action: 'rate_limit_exceeded_ip',
        endpoint: req.path,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false,
        errorMessage: `IP rate limit exceeded: ${maxRequests} requests per ${windowMs}ms`,
        riskLevel: 'high'
      });

      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests from this IP address',
        retryAfter: windowMs / 1000
      });
    }

    if (count) {
      await redis.incr(key);
    } else {
      await redis.setex(key, Math.ceil(windowMs / 1000), '1');
    }

    next();
  } catch (error) {
    logger.error('IP rate limiting error:', error);
    next();
  }
};

/**
 * Audit middleware - log all requests
 */
export const auditMiddleware = async (req, res, next) => {
  const startTime = Date.now();

  // Capture response
  const originalSend = res.send;
  let responseBody;

  res.send = function (data) {
    responseBody = data;
    originalSend.call(this, data);
  };

  // Log after response is sent
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;

      // Determine if request should be audited
      const shouldAudit = req.method !== 'GET' // Audit all non-GET requests
        || req.path.includes('/audit') // Audit access to audit logs
        || req.path.includes('/security') // Audit security endpoints
        || res.statusCode >= 400; // Audit all errors

      if (shouldAudit) {
        await auditService.log({
          userId: req.user?.id,
          username: req.user?.email,
          action: `${req.method.toLowerCase()}_${req.path.replace(/\//g, '_')}`,
          resourceType: req.baseUrl?.split('/')[2],
          method: req.method,
          endpoint: req.path,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          sessionId: req.sessionID,
          requestBody: req.body,
          responseStatus: res.statusCode,
          success: res.statusCode < 400,
          errorMessage: res.statusCode >= 400 ? responseBody : null,
          durationMs: duration
        });
      }
    } catch (error) {
      logger.error('Audit middleware error:', error);
    }
  });

  next();
};

/**
 * Validate request body against schema
 */
export const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors
    });
  }

  req.body = value;
  next();
};

/**
 * Sanitize request inputs
 */
export const sanitizeInputs = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize params
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }

  return sanitized;
}

/**
 * Sanitize individual value
 */
function sanitizeValue(value) {
  if (typeof value !== 'string') {
    return value;
  }

  // Remove potential XSS attacks
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Add password warning to response
 */
export const addPasswordWarning = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    if (res.locals.passwordWarning) {
      data.passwordWarning = res.locals.passwordWarning;
    }
    originalJson.call(this, data);
  };

  next();
};

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400 // 24 hours
};

/**
 * Security headers
 */
export const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    'default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: https:; font-src \'self\' data:;'
  );

  // Strict Transport Security (HTTPS only)
  if (req.secure) {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  next();
};

/**
 * Optional authentication (doesn't fail if no token)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await pool.query(
      'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0 && result.rows[0].is_active) {
      req.user = result.rows[0];
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

/**
 * Check IP whitelist
 */
export const checkIPWhitelist = (whitelist = []) => (req, res, next) => {
  if (whitelist.length === 0) {
    return next();
  }

  const clientIP = req.ip;

  if (!whitelist.includes(clientIP)) {
    auditService.log({
      action: 'ip_whitelist_violation',
      ipAddress: clientIP,
      endpoint: req.path,
      method: req.method,
      success: false,
      errorMessage: 'IP not in whitelist',
      riskLevel: 'high'
    });

    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Your IP address is not authorized'
    });
  }

  next();
};

/**
 * Maintenance mode check
 */
export const checkMaintenance = async (req, res, next) => {
  try {
    const maintenanceMode = await redis.get('maintenance_mode');

    if (maintenanceMode === 'true') {
      // Allow admin access during maintenance
      if (req.user?.role === 'admin') {
        return next();
      }

      return res.status(503).json({
        success: false,
        error: 'Service unavailable',
        message:
          'System is currently under maintenance. Please try again later.',
        maintenanceMode: true
      });
    }

    next();
  } catch (error) {
    logger.error('Maintenance check error:', error);
    next();
  }
};

export default {
  authenticate,
  requireRole,
  checkPasswordExpiration,
  checkForcePasswordReset,
  rateLimitByUser,
  rateLimitByIP,
  auditMiddleware,
  validateBody,
  sanitizeInputs,
  addPasswordWarning,
  corsOptions,
  securityHeaders,
  optionalAuth,
  checkIPWhitelist,
  checkMaintenance
};
