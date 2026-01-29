/**
 * Enhanced Error Handling System
 * ===============================
 *
 * Comprehensive error handling with:
 * - Standardized error codes and messages
 * - Internationalization (i18n) support
 * - Error categorization and severity levels
 * - Detailed error logging
 * - User-friendly error responses
 * - Development vs Production error details
 * - Error tracking and monitoring
 *
 * Industry Standards:
 * - RFC 7807 (Problem Details for HTTP APIs)
 * - HTTP status codes (RFC 7231)
 * - Error code conventions
 */

import auditService from '../services/audit-service.js';
import logger from '../utils/logger.js';

// Environment
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

/**
 * Standard Error Codes
 *
 * Format: CATEGORY_SUBCATEGORY_DESCRIPTION
 * Example: AUTH_TOKEN_EXPIRED, VALIDATION_FIELD_REQUIRED
 */
export const ErrorCodes = {
  // Authentication Errors (1xxx)
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_MFA_REQUIRED: 'AUTH_MFA_REQUIRED',
  AUTH_MFA_INVALID: 'AUTH_MFA_INVALID',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_ACCOUNT_DISABLED: 'AUTH_ACCOUNT_DISABLED',
  AUTH_PASSWORD_EXPIRED: 'AUTH_PASSWORD_EXPIRED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',

  // Authorization Errors (2xxx)
  AUTHZ_PERMISSION_DENIED: 'AUTHZ_PERMISSION_DENIED',
  AUTHZ_INSUFFICIENT_PRIVILEGES: 'AUTHZ_INSUFFICIENT_PRIVILEGES',
  AUTHZ_RESOURCE_FORBIDDEN: 'AUTHZ_RESOURCE_FORBIDDEN',
  AUTHZ_IP_NOT_WHITELISTED: 'AUTHZ_IP_NOT_WHITELISTED',

  // Validation Errors (3xxx)
  VALIDATION_FIELD_REQUIRED: 'VALIDATION_FIELD_REQUIRED',
  VALIDATION_FIELD_INVALID: 'VALIDATION_FIELD_INVALID',
  VALIDATION_EMAIL_INVALID: 'VALIDATION_EMAIL_INVALID',
  VALIDATION_PASSWORD_WEAK: 'VALIDATION_PASSWORD_WEAK',
  VALIDATION_LENGTH_EXCEEDED: 'VALIDATION_LENGTH_EXCEEDED',
  VALIDATION_FORMAT_INVALID: 'VALIDATION_FORMAT_INVALID',

  // Resource Errors (4xxx)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_DELETED: 'RESOURCE_DELETED',

  // Rate Limiting Errors (5xxx)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_IP_EXCEEDED: 'RATE_LIMIT_IP_EXCEEDED',
  RATE_LIMIT_USER_EXCEEDED: 'RATE_LIMIT_USER_EXCEEDED',

  // Database Errors (6xxx)
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED: 'DATABASE_QUERY_FAILED',
  DATABASE_CONSTRAINT_VIOLATION: 'DATABASE_CONSTRAINT_VIOLATION',
  DATABASE_DEADLOCK: 'DATABASE_DEADLOCK',

  // External Service Errors (7xxx)
  EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_TIMEOUT: 'EXTERNAL_SERVICE_TIMEOUT',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Internal Errors (8xxx)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  INTERNAL_SERVICE_ERROR: 'INTERNAL_SERVICE_ERROR',
  INTERNAL_CONFIGURATION_ERROR: 'INTERNAL_CONFIGURATION_ERROR',

  // Maintenance Errors (9xxx)
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
  SERVICE_DEGRADED: 'SERVICE_DEGRADED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

/**
 * Error Messages (English)
 */
const ERROR_MESSAGES_EN = {
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCodes.AUTH_TOKEN_EXPIRED]:
    'Your session has expired. Please log in again',
  [ErrorCodes.AUTH_TOKEN_INVALID]: 'Invalid authentication token',
  [ErrorCodes.AUTH_TOKEN_MISSING]: 'Authentication token is required',
  [ErrorCodes.AUTH_MFA_REQUIRED]: 'Multi-factor authentication is required',
  [ErrorCodes.AUTH_MFA_INVALID]: 'Invalid MFA code',
  [ErrorCodes.AUTH_ACCOUNT_LOCKED]:
    'Account is temporarily locked due to multiple failed login attempts',
  [ErrorCodes.AUTH_ACCOUNT_DISABLED]: 'Account has been disabled',
  [ErrorCodes.AUTH_PASSWORD_EXPIRED]:
    'Your password has expired. Please change your password',
  [ErrorCodes.AUTH_SESSION_EXPIRED]:
    'Your session has expired. Please log in again',

  [ErrorCodes.AUTHZ_PERMISSION_DENIED]: 'Permission denied',
  [ErrorCodes.AUTHZ_INSUFFICIENT_PRIVILEGES]:
    'Insufficient privileges to perform this action',
  [ErrorCodes.AUTHZ_RESOURCE_FORBIDDEN]: 'Access to this resource is forbidden',
  [ErrorCodes.AUTHZ_IP_NOT_WHITELISTED]: 'Your IP address is not authorized',

  [ErrorCodes.VALIDATION_FIELD_REQUIRED]: 'This field is required',
  [ErrorCodes.VALIDATION_FIELD_INVALID]: 'Invalid field value',
  [ErrorCodes.VALIDATION_EMAIL_INVALID]: 'Invalid email address',
  [ErrorCodes.VALIDATION_PASSWORD_WEAK]:
    'Password does not meet security requirements',
  [ErrorCodes.VALIDATION_LENGTH_EXCEEDED]: 'Value exceeds maximum length',
  [ErrorCodes.VALIDATION_FORMAT_INVALID]: 'Invalid format',

  [ErrorCodes.RESOURCE_NOT_FOUND]: 'Resource not found',
  [ErrorCodes.RESOURCE_ALREADY_EXISTS]: 'Resource already exists',
  [ErrorCodes.RESOURCE_CONFLICT]: 'Resource conflict',
  [ErrorCodes.RESOURCE_DELETED]: 'Resource has been deleted',

  [ErrorCodes.RATE_LIMIT_EXCEEDED]:
    'Rate limit exceeded. Please try again later',
  [ErrorCodes.RATE_LIMIT_IP_EXCEEDED]: 'Too many requests from your IP address',
  [ErrorCodes.RATE_LIMIT_USER_EXCEEDED]: 'Too many requests. Please slow down',

  [ErrorCodes.DATABASE_CONNECTION_FAILED]: 'Database connection failed',
  [ErrorCodes.DATABASE_QUERY_FAILED]: 'Database query failed',
  [ErrorCodes.DATABASE_CONSTRAINT_VIOLATION]: 'Database constraint violation',
  [ErrorCodes.DATABASE_DEADLOCK]: 'Database deadlock detected',

  [ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE]:
    'External service is currently unavailable',
  [ErrorCodes.EXTERNAL_SERVICE_TIMEOUT]: 'External service request timed out',
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 'External service error',

  [ErrorCodes.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [ErrorCodes.INTERNAL_SERVICE_ERROR]: 'Internal service error',
  [ErrorCodes.INTERNAL_CONFIGURATION_ERROR]: 'Configuration error',

  [ErrorCodes.MAINTENANCE_MODE]: 'System is currently under maintenance',
  [ErrorCodes.SERVICE_DEGRADED]: 'Service is running with degraded performance',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable'
};

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Error categories
 */
export const ErrorCategory = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  VALIDATION: 'validation',
  RESOURCE: 'resource',
  RATE_LIMIT: 'rate_limit',
  DATABASE: 'database',
  EXTERNAL_SERVICE: 'external_service',
  INTERNAL: 'internal',
  MAINTENANCE: 'maintenance'
};

/**
 * Custom Application Error class
 */
export class AppError extends Error {
  constructor({
    code,
    message,
    statusCode = 500,
    severity = ErrorSeverity.MEDIUM,
    category = ErrorCategory.INTERNAL,
    details = {},
    cause = null
  }) {
    super(message || ERROR_MESSAGES_EN[code] || 'An error occurred');

    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.category = category;
    this.details = details;
    this.cause = cause;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        category: this.category,
        severity: this.severity,
        details: IS_PRODUCTION ? undefined : this.details,
        timestamp: this.timestamp
      }
    };
  }
}

/**
 * Get error message with i18n support
 */
export const getErrorMessage = (code, language = 'en') => {
  // Currently only English, but can be extended
  const messages = {
    en: ERROR_MESSAGES_EN
  };

  return (
    messages[language]?.[code] || ERROR_MESSAGES_EN[code] || 'An error occurred'
  );
};

/**
 * Create standardized error response
 */
export const createErrorResponse = (error, req) => {
  const language = req.get('Accept-Language')?.split(',')[0]?.split('-')[0] || 'en';

  // Handle AppError
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: getErrorMessage(error.code, language),
        category: error.category,
        severity: error.severity,
        timestamp: error.timestamp,
        ...(IS_PRODUCTION
          ? {}
          : {
            details: error.details,
            stack: error.stack
          }),
        requestId: req.id,
        path: req.path
      }
    };
  }

  // Handle standard Error
  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: IS_PRODUCTION
          ? getErrorMessage(ErrorCodes.INTERNAL_SERVER_ERROR, language)
          : error.message,
        category: ErrorCategory.INTERNAL,
        severity: ErrorSeverity.HIGH,
        timestamp: new Date().toISOString(),
        ...(IS_PRODUCTION
          ? {}
          : {
            stack: error.stack
          }),
        requestId: req.id,
        path: req.path
      }
    };
  }

  // Handle unknown errors
  return {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      message: getErrorMessage(ErrorCodes.INTERNAL_SERVER_ERROR, language),
      category: ErrorCategory.INTERNAL,
      severity: ErrorSeverity.HIGH,
      timestamp: new Date().toISOString(),
      requestId: req.id,
      path: req.path
    }
  };
};

/**
 * Error handling middleware
 */
export const errorHandler = async (err, req, res, next) => {
  try {
    // Log error to audit service
    await auditService.log({
      userId: req.user?.id,
      username: req.user?.email,
      action: 'error_occurred',
      resourceType: req.baseUrl?.split('/')[2],
      endpoint: req.path,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: false,
      errorMessage: err.message,
      errorCode: err.code || ErrorCodes.INTERNAL_SERVER_ERROR,
      requestBody: req.body,
      responseStatus: err.statusCode || 500,
      riskLevel: err.severity || ErrorSeverity.MEDIUM
    });

    // Create error response
    const errorResponse = createErrorResponse(err, req);

    // Set status code
    const statusCode = err.statusCode || 500;
    res.status(statusCode);

    // Add error headers
    res.setHeader('X-Error-Code', err.code || ErrorCodes.INTERNAL_SERVER_ERROR);
    res.setHeader('X-Error-Category', err.category || ErrorCategory.INTERNAL);
    res.setHeader('X-Request-Id', req.id);

    // Send error response
    res.json(errorResponse);
  } catch (error) {
    // Fallback error handling
    logger.error('Error handler failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  const error = new AppError({
    code: ErrorCodes.RESOURCE_NOT_FOUND,
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.RESOURCE,
    details: {
      method: req.method,
      path: req.path
    }
  });

  res.status(404).json(createErrorResponse(error, req));
};

/**
 * Async handler wrapper
 * Catches async errors and passes them to error handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation error helper
 */
export const validationError = (field, message, details = {}) => new AppError({
  code: ErrorCodes.VALIDATION_FIELD_INVALID,
  message: message || `Invalid value for field: ${field}`,
  statusCode: 400,
  severity: ErrorSeverity.LOW,
  category: ErrorCategory.VALIDATION,
  details: { field, ...details }
});

/**
 * Authentication error helper
 */
export const authenticationError = (code = ErrorCodes.AUTH_TOKEN_INVALID) => new AppError({
  code,
  statusCode: 401,
  severity: ErrorSeverity.MEDIUM,
  category: ErrorCategory.AUTHENTICATION
});

/**
 * Authorization error helper
 */
export const authorizationError = (code = ErrorCodes.AUTHZ_PERMISSION_DENIED) => new AppError({
  code,
  statusCode: 403,
  severity: ErrorSeverity.MEDIUM,
  category: ErrorCategory.AUTHORIZATION
});

/**
 * Not found error helper
 */
export const notFoundError = (resource = 'Resource') => new AppError({
  code: ErrorCodes.RESOURCE_NOT_FOUND,
  message: `${resource} not found`,
  statusCode: 404,
  severity: ErrorSeverity.LOW,
  category: ErrorCategory.RESOURCE
});

/**
 * Rate limit error helper
 */
export const rateLimitError = (retryAfter = 60) => new AppError({
  code: ErrorCodes.RATE_LIMIT_EXCEEDED,
  statusCode: 429,
  severity: ErrorSeverity.MEDIUM,
  category: ErrorCategory.RATE_LIMIT,
  details: { retryAfter }
});

/**
 * Database error helper
 */
export const databaseError = (message, cause = null) => new AppError({
  code: ErrorCodes.DATABASE_QUERY_FAILED,
  message,
  statusCode: 500,
  severity: ErrorSeverity.HIGH,
  category: ErrorCategory.DATABASE,
  cause
});

/**
 * External service error helper
 */
export const externalServiceError = (serviceName, cause = null) => new AppError({
  code: ErrorCodes.EXTERNAL_SERVICE_ERROR,
  message: `${serviceName} service error`,
  statusCode: 502,
  severity: ErrorSeverity.HIGH,
  category: ErrorCategory.EXTERNAL_SERVICE,
  details: { service: serviceName },
  cause
});

export default {
  ErrorCodes,
  ErrorSeverity,
  ErrorCategory,
  AppError,
  getErrorMessage,
  createErrorResponse,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validationError,
  authenticationError,
  authorizationError,
  notFoundError,
  rateLimitError,
  databaseError,
  externalServiceError
};
