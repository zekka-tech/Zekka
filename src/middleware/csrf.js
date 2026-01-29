/**
 * CSRF Protection Middleware
 *
 * Implements Cross-Site Request Forgery (CSRF) protection using double-submit cookies
 * and synchronizer tokens.
 *
 * Features:
 * - CSRF token generation and validation
 * - Cookie-based token storage
 * - Exemption for safe methods (GET, HEAD, OPTIONS)
 * - Configuration for specific routes
 * - Integration with session middleware
 *
 * @module middleware/csrf
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

// Token storage (in production, use Redis or session storage)
const tokenStorage = new Map(); // sessionId -> token

/**
 * Generate a CSRF token
 * @param {string} sessionId - User session ID
 * @returns {string} CSRF token
 */
function generateCsrfToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  tokenStorage.set(sessionId, {
    token,
    createdAt: Date.now()
  });
  return token;
}

/**
 * Validate CSRF token
 * @param {string} sessionId - User session ID
 * @param {string} token - Token to validate
 * @returns {boolean} Token is valid
 */
function validateCsrfToken(sessionId, token) {
  const stored = tokenStorage.get(sessionId);

  if (!stored) {
    logger.warn('CSRF: No stored token for session', { sessionId });
    return false;
  }

  // Check token expiration (24 hours)
  if (Date.now() - stored.createdAt > 24 * 60 * 60 * 1000) {
    tokenStorage.delete(sessionId);
    logger.warn('CSRF: Token expired', { sessionId });
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  const valid = crypto.timingSafeEqual(
    Buffer.from(stored.token),
    Buffer.from(token)
  );

  return valid;
}

/**
 * CSRF token generation middleware
 * Generates and stores CSRF token in session
 */
function csrfTokenGenerator(req, res, next) {
  // Initialize session ID if not present
  if (!req.sessionID) {
    req.sessionID = crypto.randomBytes(16).toString('hex');
  }

  // Generate token if not already present
  if (!req.session || !req.session.csrfToken) {
    const token = generateCsrfToken(req.sessionID);

    if (!req.session) {
      req.session = {};
    }
    req.session.csrfToken = token;
  }

  // Make token available in res.locals for template rendering
  res.locals.csrfToken = req.session.csrfToken;

  next();
}

/**
 * CSRF token validation middleware
 * Validates CSRF token for state-changing requests
 */
function csrfTokenValidator(req, res, next) {
  // Safe methods - skip CSRF validation
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // WebSocket connections - skip CSRF validation
  if (req.ws) {
    return next();
  }

  // API endpoints with bearer tokens - skip CSRF validation
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  // Get CSRF token from multiple sources
  const token =
    req.headers['x-csrf-token'] ||
    req.headers['x-xsrf-token'] ||
    (req.body && req.body._csrf) ||
    req.query._csrf;

  if (!token) {
    logger.warn('CSRF: No token provided', {
      method: req.method,
      path: req.path,
      ip: req.ip
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  // Validate token
  const sessionId = req.sessionID || (req.session && req.session.id);
  if (!sessionId) {
    logger.error('CSRF: No session ID found', { path: req.path });
    return res.status(403).json({
      success: false,
      error: 'Session not found',
      code: 'SESSION_NOT_FOUND'
    });
  }

  let isValid;
  try {
    isValid = validateCsrfToken(sessionId, token);
  } catch (error) {
    logger.error('CSRF: Token validation error', {
      error: error.message,
      sessionId
    });
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  if (!isValid) {
    logger.warn('CSRF: Token validation failed', {
      sessionId,
      method: req.method,
      path: req.path,
      ip: req.ip
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF token validation failed',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  // Token is valid, regenerate for next request
  const newToken = generateCsrfToken(sessionId);
  if (req.session) {
    req.session.csrfToken = newToken;
  }
  res.locals.csrfToken = newToken;

  next();
}

/**
 * Create CSRF protection with custom options
 * @param {Object} options - Configuration options
 * @returns {Object} Middleware functions
 */
function createCsrfProtection(options = {}) {
  const config = {
    excludePaths: options.excludePaths || [],
    headerName: options.headerName || 'x-csrf-token',
    fieldName: options.fieldName || '_csrf',
    sessionKey: options.sessionKey || 'csrfToken',
    ...options
  };

  return {
    /**
     * Generate CSRF token
     */
    generateToken: (req, res) => {
      if (!req.sessionID) {
        req.sessionID = crypto.randomBytes(16).toString('hex');
      }
      const token = generateCsrfToken(req.sessionID);
      if (!req.session) {
        req.session = {};
      }
      req.session[config.sessionKey] = token;
      return token;
    },

    /**
     * Get CSRF token from request
     */
    getToken: (req) => {
      return req.session && req.session[config.sessionKey];
    },

    /**
     * Middleware to generate and validate CSRF tokens
     */
    middleware: (req, res, next) => {
      // Check if path is excluded
      if (config.excludePaths.some(path => req.path.startsWith(path))) {
        return next();
      }

      // Generate token if needed
      if (!req.session || !req.session[config.sessionKey]) {
        const token = generateCsrfToken(req.sessionID);
        if (!req.session) {
          req.session = {};
        }
        req.session[config.sessionKey] = token;
      }

      res.locals.csrfToken = req.session[config.sessionKey];

      // Validate token for state-changing requests
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const token =
          req.headers[config.headerName.toLowerCase()] ||
          (req.body && req.body[config.fieldName]) ||
          req.query[config.fieldName];

        if (!token) {
          return res.status(403).json({
            success: false,
            error: 'CSRF token missing',
            code: 'CSRF_TOKEN_MISSING'
          });
        }

        try {
          const sessionId = req.sessionID;
          if (!validateCsrfToken(sessionId, token)) {
            return res.status(403).json({
              success: false,
              error: 'CSRF token validation failed',
              code: 'CSRF_TOKEN_INVALID'
            });
          }

          // Regenerate token
          const newToken = generateCsrfToken(sessionId);
          req.session[config.sessionKey] = newToken;
          res.locals.csrfToken = newToken;
        } catch (error) {
          logger.error('CSRF validation error:', error);
          return res.status(403).json({
            success: false,
            error: 'CSRF validation failed',
            code: 'CSRF_ERROR'
          });
        }
      }

      next();
    }
  };
}

/**
 * Helper to clean up expired CSRF tokens
 * Should be called periodically (e.g., hourly)
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  const expirationTime = 24 * 60 * 60 * 1000; // 24 hours

  for (const [sessionId, data] of tokenStorage.entries()) {
    if (now - data.createdAt > expirationTime) {
      tokenStorage.delete(sessionId);
      logger.debug('CSRF: Cleaned up expired token', { sessionId });
    }
  }
}

// Start cleanup job (every 6 hours)
setInterval(cleanupExpiredTokens, 6 * 60 * 60 * 1000);

module.exports = {
  csrfTokenGenerator,
  csrfTokenValidator,
  createCsrfProtection,
  generateCsrfToken,
  validateCsrfToken,
  cleanupExpiredTokens
};
