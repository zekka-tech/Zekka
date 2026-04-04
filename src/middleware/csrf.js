/**
 * CSRF Protection Middleware
 *
 * Uses the Redis-backed express-session store as the authoritative CSRF token
 * source so tokens survive process restarts and multi-instance deployments.
 *
 * @module middleware/csrf
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

const CSRF_SESSION_KEY = 'csrf';
const CSRF_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function generateTokenValue() {
  return crypto.randomBytes(32).toString('hex');
}

function getStoredToken(req) {
  if (!req.session || !req.session[CSRF_SESSION_KEY]) {
    return null;
  }

  return req.session[CSRF_SESSION_KEY];
}

function storeCsrfToken(req, token = generateTokenValue()) {
  req.session[CSRF_SESSION_KEY] = {
    token,
    createdAt: Date.now()
  };
  req.session.csrfToken = token;

  return token;
}

function clearStoredToken(req) {
  if (!req.session) {
    return;
  }

  delete req.session[CSRF_SESSION_KEY];
  delete req.session.csrfToken;
}

function ensureSession(req, res) {
  if (req.session) {
    return true;
  }

  logger.error('CSRF: Session middleware is required before CSRF protection', {
    path: req.path
  });

  res.status(500).json({
    success: false,
    error: 'Session middleware not configured',
    code: 'SESSION_NOT_CONFIGURED'
  });

  return false;
}

/**
 * Generate a CSRF token and persist it in the session store.
 * @param {object} req - Express request
 * @returns {string} CSRF token
 */
function generateCsrfToken(req) {
  return storeCsrfToken(req);
}

/**
 * Validate a token against the session-backed store.
 * @param {object} req - Express request
 * @param {string} token - Token to validate
 * @returns {boolean} Token is valid
 */
function validateCsrfToken(req, token) {
  const stored = getStoredToken(req);

  if (!stored) {
    logger.warn('CSRF: No stored token for session', { sessionId: req.sessionID });
    return false;
  }

  if (Date.now() - stored.createdAt > CSRF_TOKEN_TTL_MS) {
    clearStoredToken(req);
    logger.warn('CSRF: Token expired', { sessionId: req.sessionID });
    return false;
  }

  if (typeof token !== 'string' || token.length !== stored.token.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(stored.token),
    Buffer.from(token)
  );
}

function csrfTokenGenerator(req, res, next) {
  if (!ensureSession(req, res)) {
    return;
  }

  const stored = getStoredToken(req);
  if (!stored) {
    storeCsrfToken(req);
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function csrfTokenValidator(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (req.ws) {
    return next();
  }

  if (
    req.headers.authorization
    && req.headers.authorization.startsWith('Bearer ')
  ) {
    return next();
  }

  if (!ensureSession(req, res)) {
    return;
  }

  const token = req.headers['x-csrf-token']
    || req.headers['x-xsrf-token']
    || (req.body && req.body._csrf)
    || req.query._csrf;

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

  if (!req.sessionID) {
    logger.error('CSRF: No session ID found', { path: req.path });
    return res.status(403).json({
      success: false,
      error: 'Session not found',
      code: 'SESSION_NOT_FOUND'
    });
  }

  let isValid;
  try {
    isValid = validateCsrfToken(req, token);
  } catch (error) {
    logger.error('CSRF: Token validation error', {
      error: error.message,
      sessionId: req.sessionID
    });
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  if (!isValid) {
    logger.warn('CSRF: Token validation failed', {
      sessionId: req.sessionID,
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

  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function createCsrfProtection(options = {}) {
  const config = {
    excludePaths: options.excludePaths || [],
    headerName: options.headerName || 'x-csrf-token',
    fieldName: options.fieldName || '_csrf',
    sessionKey: options.sessionKey || 'csrfToken',
    ...options
  };

  return {
    generateToken: (req) => {
      if (!req.session) {
        throw new Error('Session middleware is required for CSRF protection');
      }

      const token = storeCsrfToken(req);
      req.session[config.sessionKey] = token;
      return token;
    },

    getToken: (req) => req.session && req.session[config.sessionKey],

    middleware: (req, res, next) => {
      if (config.excludePaths.some((path) => req.path.startsWith(path))) {
        return next();
      }

      if (!ensureSession(req, res)) {
        return;
      }

      if (!req.session[config.sessionKey]) {
        req.session[config.sessionKey] = storeCsrfToken(req);
      }

      res.locals.csrfToken = req.session[config.sessionKey];

      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const token = req.headers[config.headerName.toLowerCase()]
          || (req.body && req.body[config.fieldName])
          || req.query[config.fieldName];

        if (!token) {
          return res.status(403).json({
            success: false,
            error: 'CSRF token missing',
            code: 'CSRF_TOKEN_MISSING'
          });
        }

        try {
          if (!validateCsrfToken(req, token)) {
            return res.status(403).json({
              success: false,
              error: 'CSRF token validation failed',
              code: 'CSRF_TOKEN_INVALID'
            });
          }

          req.session[config.sessionKey] = req.session.csrfToken;
          res.locals.csrfToken = req.session.csrfToken;
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

function cleanupExpiredTokens() {
  return 0;
}

module.exports = {
  csrfTokenGenerator,
  csrfTokenValidator,
  createCsrfProtection,
  generateCsrfToken,
  validateCsrfToken,
  cleanupExpiredTokens
};
