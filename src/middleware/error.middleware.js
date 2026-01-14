/**
 * Error Handling Middleware
 * 
 * SECURITY FIX: Phase 3 - Comprehensive error handling
 */

const config = require('../config');
const { logAuditEvent } = require('./auth.secure');

/**
 * Error response formatter
 */
function formatError(err, requestId) {
  const error = {
    message: err.message || 'Internal server error',
    code: err.name || 'ERROR',
    statusCode: err.statusCode || 500,
    timestamp: new Date().toISOString(),
    requestId
  };
  
  // Add details in development only
  if (config.isDevelopment) {
    error.stack = err.stack;
    error.details = err.details;
  }
  
  return error;
}

/**
 * Error logging
 */
function logError(err, req) {
  const errorLog = {
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500,
    method: req.method,
    path: req.path,
    ip: req.realIP || req.ip,
    userId: req.user?.userId,
    userAgent: req.headers['user-agent'],
    requestId: req.id,
    timestamp: new Date().toISOString()
  };
  
  // Log based on severity
  if (err.statusCode >= 500) {
    console.error('❌ ERROR:', JSON.stringify(errorLog, null, 2));
  } else if (err.statusCode >= 400) {
    console.warn('⚠️  WARNING:', JSON.stringify(errorLog, null, 2));
  }
  
  // Log to audit trail for security-related errors
  if (err.name === 'AuthenticationError' || err.name === 'AuthorizationError') {
    logAuditEvent('error.security', errorLog);
  }
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  // Log error
  logError(err, req);
  
  // Format error response
  const errorResponse = formatError(err, req.id);
  
  // Send response
  res.status(errorResponse.statusCode).json({
    error: errorResponse
  });
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: 'Not found',
      code: 'NOT_FOUND',
      statusCode: 404,
      path: req.path,
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
}

/**
 * Async error wrapper
 * Catches errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Unhandled rejection handler
 */
function setupUnhandledRejectionHandler() {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Log to monitoring service
  });
  
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Log to monitoring service
    // Graceful shutdown
    process.exit(1);
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  setupUnhandledRejectionHandler
};
