/**
 * Enhanced Error Handling System
 * ================================
 *
 * Standardized error codes, categorization, and middleware.
 *
 * Industry Standards: RFC 7807 (Problem Details for HTTP APIs)
 */

const auditService = require('../services/audit-service');
const logger = require('../utils/logger');

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

/**
 * Standard Error Codes
 */
const ErrorCodes = {
  // Authentication (1xxx)
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

  // Authorization (2xxx)
  AUTHZ_PERMISSION_DENIED: 'AUTHZ_PERMISSION_DENIED',
  AUTHZ_INSUFFICIENT_PRIVILEGES: 'AUTHZ_INSUFFICIENT_PRIVILEGES',
  AUTHZ_RESOURCE_FORBIDDEN: 'AUTHZ_RESOURCE_FORBIDDEN',
  AUTHZ_IP_NOT_WHITELISTED: 'AUTHZ_IP_NOT_WHITELISTED',

  // Validation (3xxx)
  VALIDATION_FIELD_REQUIRED: 'VALIDATION_FIELD_REQUIRED',
  VALIDATION_FIELD_INVALID: 'VALIDATION_FIELD_INVALID',
  VALIDATION_EMAIL_INVALID: 'VALIDATION_EMAIL_INVALID',
  VALIDATION_PASSWORD_WEAK: 'VALIDATION_PASSWORD_WEAK',
  VALIDATION_LENGTH_EXCEEDED: 'VALIDATION_LENGTH_EXCEEDED',
  VALIDATION_FORMAT_INVALID: 'VALIDATION_FORMAT_INVALID',

  // Resource (4xxx)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_DELETED: 'RESOURCE_DELETED',

  // Rate Limiting (5xxx)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_IP_EXCEEDED: 'RATE_LIMIT_IP_EXCEEDED',
  RATE_LIMIT_USER_EXCEEDED: 'RATE_LIMIT_USER_EXCEEDED',

  // Database (6xxx)
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED: 'DATABASE_QUERY_FAILED',
  DATABASE_CONSTRAINT_VIOLATION: 'DATABASE_CONSTRAINT_VIOLATION',
  DATABASE_DEADLOCK: 'DATABASE_DEADLOCK',

  // External Service (7xxx)
  EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_TIMEOUT: 'EXTERNAL_SERVICE_TIMEOUT',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Internal (8xxx)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  INTERNAL_SERVICE_ERROR: 'INTERNAL_SERVICE_ERROR',
  INTERNAL_CONFIGURATION_ERROR: 'INTERNAL_CONFIGURATION_ERROR',

  // Maintenance (9xxx)
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
  SERVICE_DEGRADED: 'SERVICE_DEGRADED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

const ERROR_MESSAGES = {
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: 'Your session has expired. Please log in again',
  [ErrorCodes.AUTH_TOKEN_INVALID]: 'Invalid authentication token',
  [ErrorCodes.AUTH_TOKEN_MISSING]: 'Authentication token is required',
  [ErrorCodes.AUTH_MFA_REQUIRED]: 'Multi-factor authentication is required',
  [ErrorCodes.AUTH_MFA_INVALID]: 'Invalid MFA code',
  [ErrorCodes.AUTH_ACCOUNT_LOCKED]: 'Account is temporarily locked due to multiple failed login attempts',
  [ErrorCodes.AUTH_ACCOUNT_DISABLED]: 'Account has been disabled',
  [ErrorCodes.AUTH_PASSWORD_EXPIRED]: 'Your password has expired. Please change your password',
  [ErrorCodes.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please log in again',
  [ErrorCodes.AUTHZ_PERMISSION_DENIED]: 'Permission denied',
  [ErrorCodes.AUTHZ_INSUFFICIENT_PRIVILEGES]: 'Insufficient privileges to perform this action',
  [ErrorCodes.AUTHZ_RESOURCE_FORBIDDEN]: 'Access to this resource is forbidden',
  [ErrorCodes.AUTHZ_IP_NOT_WHITELISTED]: 'Your IP address is not authorized',
  [ErrorCodes.VALIDATION_FIELD_REQUIRED]: 'This field is required',
  [ErrorCodes.VALIDATION_FIELD_INVALID]: 'Invalid field value',
  [ErrorCodes.VALIDATION_EMAIL_INVALID]: 'Invalid email address',
  [ErrorCodes.VALIDATION_PASSWORD_WEAK]: 'Password does not meet security requirements',
  [ErrorCodes.VALIDATION_LENGTH_EXCEEDED]: 'Value exceeds maximum length',
  [ErrorCodes.VALIDATION_FORMAT_INVALID]: 'Invalid format',
  [ErrorCodes.RESOURCE_NOT_FOUND]: 'Resource not found',
  [ErrorCodes.RESOURCE_ALREADY_EXISTS]: 'Resource already exists',
  [ErrorCodes.RESOURCE_CONFLICT]: 'Resource conflict',
  [ErrorCodes.RESOURCE_DELETED]: 'Resource has been deleted',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please try again later',
  [ErrorCodes.RATE_LIMIT_IP_EXCEEDED]: 'Too many requests from your IP address',
  [ErrorCodes.RATE_LIMIT_USER_EXCEEDED]: 'Too many requests. Please slow down',
  [ErrorCodes.DATABASE_CONNECTION_FAILED]: 'Database connection failed',
  [ErrorCodes.DATABASE_QUERY_FAILED]: 'Database query failed',
  [ErrorCodes.DATABASE_CONSTRAINT_VIOLATION]: 'Database constraint violation',
  [ErrorCodes.DATABASE_DEADLOCK]: 'Database deadlock detected',
  [ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE]: 'External service is currently unavailable',
  [ErrorCodes.EXTERNAL_SERVICE_TIMEOUT]: 'External service request timed out',
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 'External service error',
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [ErrorCodes.INTERNAL_SERVICE_ERROR]: 'Internal service error',
  [ErrorCodes.INTERNAL_CONFIGURATION_ERROR]: 'Configuration error',
  [ErrorCodes.MAINTENANCE_MODE]: 'System is currently under maintenance',
  [ErrorCodes.SERVICE_DEGRADED]: 'Service is running with degraded performance',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable'
};

const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

const ErrorCategory = {
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
class AppError extends Error {
  constructor({
    code,
    message,
    statusCode = 500,
    severity = ErrorSeverity.MEDIUM,
    category = ErrorCategory.INTERNAL,
    details = {},
    cause = null
  }) {
    super(message || ERROR_MESSAGES[code] || 'An error occurred');

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
        details: process.env.NODE_ENV === 'production' ? undefined : this.details,
        timestamp: this.timestamp
      }
    };
  }
}

const getErrorMessage = (code) =>
  ERROR_MESSAGES[code] || 'An error occurred';

const createErrorResponse = (error, req) => {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: getErrorMessage(error.code),
        category: error.category,
        severity: error.severity,
        timestamp: error.timestamp,
        ...(IS_PRODUCTION ? {} : { details: error.details, stack: error.stack }),
        requestId: req && req.id,
        path: req && req.path
      }
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: IS_PRODUCTION
          ? getErrorMessage(ErrorCodes.INTERNAL_SERVER_ERROR)
          : error.message,
        category: ErrorCategory.INTERNAL,
        severity: ErrorSeverity.HIGH,
        timestamp: new Date().toISOString(),
        ...(IS_PRODUCTION ? {} : { stack: error.stack }),
        requestId: req && req.id,
        path: req && req.path
      }
    };
  }

  return {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      message: getErrorMessage(ErrorCodes.INTERNAL_SERVER_ERROR),
      category: ErrorCategory.INTERNAL,
      severity: ErrorSeverity.HIGH,
      timestamp: new Date().toISOString(),
      requestId: req && req.id,
      path: req && req.path
    }
  };
};

/**
 * Express error-handling middleware (4 params)
 */
const errorHandler = async (err, req, res, next) => { // eslint-disable-line no-unused-vars
  try {
    await auditService.log({
      userId: req.user && req.user.id,
      username: req.user && req.user.email,
      action: 'error_occurred',
      resourceType: req.baseUrl && req.baseUrl.split('/')[2],
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
  } catch (auditErr) {
    logger.error('Audit log failed in error handler:', auditErr);
  }

  const errorResponse = createErrorResponse(err, req);
  const statusCode = err.statusCode || 500;

  res.setHeader('X-Error-Code', err.code || ErrorCodes.INTERNAL_SERVER_ERROR);
  res.setHeader('X-Error-Category', err.category || ErrorCategory.INTERNAL);
  if (req.id) res.setHeader('X-Request-Id', req.id);

  res.status(statusCode).json(errorResponse);
};

const notFoundHandler = (req, res) => {
  const error = new AppError({
    code: ErrorCodes.RESOURCE_NOT_FOUND,
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.RESOURCE,
    details: { method: req.method, path: req.path }
  });
  res.status(404).json(createErrorResponse(error, req));
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const validationError = (field, message, details = {}) => new AppError({
  code: ErrorCodes.VALIDATION_FIELD_INVALID,
  message: message || `Invalid value for field: ${field}`,
  statusCode: 400,
  severity: ErrorSeverity.LOW,
  category: ErrorCategory.VALIDATION,
  details: { field, ...details }
});

const authenticationError = (code = ErrorCodes.AUTH_TOKEN_INVALID) => new AppError({
  code,
  statusCode: 401,
  severity: ErrorSeverity.MEDIUM,
  category: ErrorCategory.AUTHENTICATION
});

const authorizationError = (code = ErrorCodes.AUTHZ_PERMISSION_DENIED) => new AppError({
  code,
  statusCode: 403,
  severity: ErrorSeverity.MEDIUM,
  category: ErrorCategory.AUTHORIZATION
});

const notFoundError = (resource = 'Resource') => new AppError({
  code: ErrorCodes.RESOURCE_NOT_FOUND,
  message: `${resource} not found`,
  statusCode: 404,
  severity: ErrorSeverity.LOW,
  category: ErrorCategory.RESOURCE
});

const rateLimitError = (retryAfter = 60) => new AppError({
  code: ErrorCodes.RATE_LIMIT_EXCEEDED,
  statusCode: 429,
  severity: ErrorSeverity.MEDIUM,
  category: ErrorCategory.RATE_LIMIT,
  details: { retryAfter }
});

const databaseError = (message, cause = null) => new AppError({
  code: ErrorCodes.DATABASE_QUERY_FAILED,
  message,
  statusCode: 500,
  severity: ErrorSeverity.HIGH,
  category: ErrorCategory.DATABASE,
  cause
});

const externalServiceError = (serviceName, cause = null) => new AppError({
  code: ErrorCodes.EXTERNAL_SERVICE_ERROR,
  message: `${serviceName} service error`,
  statusCode: 502,
  severity: ErrorSeverity.HIGH,
  category: ErrorCategory.EXTERNAL_SERVICE,
  details: { service: serviceName },
  cause
});

module.exports = {
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
