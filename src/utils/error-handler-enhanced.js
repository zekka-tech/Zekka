/**
 * Enhanced Error Handling System
 * 
 * Features:
 * - Standardized error codes
 * - Error classification and categorization
 * - Recovery strategies
 * - Error context and metadata
 * - Error tracking and analytics
 * - User-friendly error messages
 * - Developer-friendly debug info
 */

// Error codes
const ErrorCodes = {
  // General errors (1000-1999)
  UNKNOWN_ERROR: 'ERR_UNKNOWN',
  INTERNAL_SERVER_ERROR: 'ERR_INTERNAL',
  SERVICE_UNAVAILABLE: 'ERR_SERVICE_UNAVAILABLE',
  TIMEOUT: 'ERR_TIMEOUT',
  RATE_LIMIT_EXCEEDED: 'ERR_RATE_LIMIT',
  
  // Authentication errors (2000-2999)
  UNAUTHORIZED: 'ERR_UNAUTHORIZED',
  INVALID_CREDENTIALS: 'ERR_INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'ERR_TOKEN_EXPIRED',
  TOKEN_INVALID: 'ERR_TOKEN_INVALID',
  SESSION_EXPIRED: 'ERR_SESSION_EXPIRED',
  ACCOUNT_LOCKED: 'ERR_ACCOUNT_LOCKED',
  ACCOUNT_DISABLED: 'ERR_ACCOUNT_DISABLED',
  PASSWORD_EXPIRED: 'ERR_PASSWORD_EXPIRED',
  MFA_REQUIRED: 'ERR_MFA_REQUIRED',
  
  // Authorization errors (3000-3999)
  FORBIDDEN: 'ERR_FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'ERR_INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED: 'ERR_ACCESS_DENIED',
  
  // Validation errors (4000-4999)
  VALIDATION_ERROR: 'ERR_VALIDATION',
  INVALID_INPUT: 'ERR_INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'ERR_MISSING_FIELD',
  INVALID_FORMAT: 'ERR_INVALID_FORMAT',
  VALUE_TOO_LONG: 'ERR_VALUE_TOO_LONG',
  VALUE_TOO_SHORT: 'ERR_VALUE_TOO_SHORT',
  INVALID_EMAIL: 'ERR_INVALID_EMAIL',
  WEAK_PASSWORD: 'ERR_WEAK_PASSWORD',
  PASSWORD_REUSED: 'ERR_PASSWORD_REUSED',
  
  // Resource errors (5000-5999)
  NOT_FOUND: 'ERR_NOT_FOUND',
  ALREADY_EXISTS: 'ERR_ALREADY_EXISTS',
  CONFLICT: 'ERR_CONFLICT',
  GONE: 'ERR_GONE',
  
  // Database errors (6000-6999)
  DATABASE_ERROR: 'ERR_DATABASE',
  QUERY_ERROR: 'ERR_QUERY',
  CONNECTION_ERROR: 'ERR_CONNECTION',
  TRANSACTION_ERROR: 'ERR_TRANSACTION',
  CONSTRAINT_VIOLATION: 'ERR_CONSTRAINT',
  DEADLOCK: 'ERR_DEADLOCK',
  
  // External service errors (7000-7999)
  EXTERNAL_SERVICE_ERROR: 'ERR_EXTERNAL_SERVICE',
  API_ERROR: 'ERR_API',
  NETWORK_ERROR: 'ERR_NETWORK',
  UPSTREAM_TIMEOUT: 'ERR_UPSTREAM_TIMEOUT',
  
  // Business logic errors (8000-8999)
  BUSINESS_RULE_VIOLATION: 'ERR_BUSINESS_RULE',
  INSUFFICIENT_BALANCE: 'ERR_INSUFFICIENT_BALANCE',
  QUOTA_EXCEEDED: 'ERR_QUOTA_EXCEEDED',
  OPERATION_NOT_ALLOWED: 'ERR_OPERATION_NOT_ALLOWED',
  
  // Security errors (9000-9999)
  CSRF_VIOLATION: 'ERR_CSRF',
  XSS_DETECTED: 'ERR_XSS',
  SQL_INJECTION_DETECTED: 'ERR_SQL_INJECTION',
  SUSPICIOUS_ACTIVITY: 'ERR_SUSPICIOUS_ACTIVITY',
  ENCRYPTION_ERROR: 'ERR_ENCRYPTION',
  DECRYPTION_ERROR: 'ERR_DECRYPTION'
};

// Error severity levels
const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Error categories
const ErrorCategory = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  VALIDATION: 'validation',
  RESOURCE: 'resource',
  DATABASE: 'database',
  EXTERNAL: 'external',
  BUSINESS: 'business',
  SECURITY: 'security',
  SYSTEM: 'system'
};

/**
 * Base Application Error
 */
class ApplicationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.isOperational = true; // vs programmer error
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
    
    // Set defaults
    this.statusCode = details.statusCode || 500;
    this.severity = details.severity || ErrorSeverity.MEDIUM;
    this.category = details.category || ErrorCategory.SYSTEM;
    this.recoverable = details.recoverable !== false;
    this.retryable = details.retryable || false;
    this.userMessage = details.userMessage || message;
  }
  
  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.userMessage,
        timestamp: this.timestamp.toISOString(),
        category: this.category,
        ...(this.details.field && { field: this.details.field }),
        ...(this.details.value && { value: this.details.value }),
        ...(this.recoverable && { recoverable: true }),
        ...(this.retryable && { retryable: true, retryAfter: this.details.retryAfter })
      }
    };
  }
  
  /**
   * Get recovery suggestion
   */
  getRecoverySuggestion() {
    return this.details.recoverySuggestion || 'Please try again later or contact support.';
  }
}

/**
 * Authentication Error
 */
class AuthenticationError extends ApplicationError {
  constructor(code, message, details = {}) {
    super(code, message, {
      ...details,
      statusCode: 401,
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH
    });
  }
}

/**
 * Authorization Error
 */
class AuthorizationError extends ApplicationError {
  constructor(code, message, details = {}) {
    super(code, message, {
      ...details,
      statusCode: 403,
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.HIGH
    });
  }
}

/**
 * Validation Error
 */
class ValidationError extends ApplicationError {
  constructor(code, message, details = {}) {
    super(code, message, {
      ...details,
      statusCode: 400,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      recoverable: true
    });
  }
}

/**
 * Resource Error
 */
class ResourceError extends ApplicationError {
  constructor(code, message, details = {}) {
    super(code, message, {
      ...details,
      statusCode: details.statusCode || 404,
      category: ErrorCategory.RESOURCE,
      severity: ErrorSeverity.LOW
    });
  }
}

/**
 * Database Error
 */
class DatabaseError extends ApplicationError {
  constructor(code, message, details = {}) {
    super(code, message, {
      ...details,
      statusCode: 500,
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      retryAfter: 5000
    });
  }
}

/**
 * External Service Error
 */
class ExternalServiceError extends ApplicationError {
  constructor(code, message, details = {}) {
    super(code, message, {
      ...details,
      statusCode: 502,
      category: ErrorCategory.EXTERNAL,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      retryAfter: 10000
    });
  }
}

/**
 * Business Logic Error
 */
class BusinessError extends ApplicationError {
  constructor(code, message, details = {}) {
    super(code, message, {
      ...details,
      statusCode: 400,
      category: ErrorCategory.BUSINESS,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true
    });
  }
}

/**
 * Security Error
 */
class SecurityError extends ApplicationError {
  constructor(code, message, details = {}) {
    super(code, message, {
      ...details,
      statusCode: 403,
      category: ErrorCategory.SECURITY,
      severity: ErrorSeverity.CRITICAL,
      recoverable: false
    });
  }
}

/**
 * Error Handler with Recovery Strategies
 */
class ErrorHandler {
  constructor(options = {}) {
    this.options = {
      includeStackTrace: options.includeStackTrace || process.env.NODE_ENV !== 'production',
      logErrors: options.logErrors !== false,
      logger: options.logger,
      ...options
    };
    
    this.errorStats = {
      total: 0,
      byCode: new Map(),
      byCategory: new Map(),
      bySeverity: new Map()
    };
  }
  
  /**
   * Handle error
   */
  handle(error, req, res) {
    // Track error statistics
    this.trackError(error);
    
    // Log error
    if (this.options.logErrors && this.options.logger) {
      this.logError(error, req);
    }
    
    // Convert to ApplicationError if needed
    if (!(error instanceof ApplicationError)) {
      error = this.normalizeError(error);
    }
    
    // Build response
    const response = this.buildResponse(error, req);
    
    // Send response
    res.status(error.statusCode || 500).json(response);
  }
  
  /**
   * Normalize error to ApplicationError
   */
  normalizeError(error) {
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return new ValidationError(
        ErrorCodes.VALIDATION_ERROR,
        error.message,
        { originalError: error }
      );
    }
    
    if (error.name === 'UnauthorizedError' || error.statusCode === 401) {
      return new AuthenticationError(
        ErrorCodes.UNAUTHORIZED,
        error.message || 'Authentication required',
        { originalError: error }
      );
    }
    
    if (error.code === 'EBADCSRFTOKEN') {
      return new SecurityError(
        ErrorCodes.CSRF_VIOLATION,
        'CSRF token validation failed',
        { originalError: error }
      );
    }
    
    // Default to internal server error
    return new ApplicationError(
      ErrorCodes.INTERNAL_SERVER_ERROR,
      'An unexpected error occurred',
      {
        statusCode: 500,
        severity: ErrorSeverity.HIGH,
        originalError: error
      }
    );
  }
  
  /**
   * Build error response
   */
  buildResponse(error, req) {
    const response = error.toJSON();
    
    // Add request ID for tracking
    if (req && req.id) {
      response.error.requestId = req.id;
    }
    
    // Add recovery suggestions
    if (error.recoverable) {
      response.error.recovery = {
        suggestion: error.getRecoverySuggestion(),
        ...(error.retryable && {
          retryable: true,
          retryAfter: error.details.retryAfter || 5000
        })
      };
    }
    
    // Add documentation link
    response.error.documentation = `/docs/errors/${error.code}`;
    
    // Add stack trace in development
    if (this.options.includeStackTrace && error.stack) {
      response.error.stack = error.stack;
    }
    
    return response;
  }
  
  /**
   * Log error
   */
  logError(error, req) {
    const logData = {
      code: error.code,
      message: error.message,
      category: error.category,
      severity: error.severity,
      requestId: req?.id,
      userId: req?.user?.userId,
      path: req?.path,
      method: req?.method,
      ip: req?.ip,
      userAgent: req?.get('user-agent'),
      stack: error.stack
    };
    
    const level = this.getLogLevel(error.severity);
    this.options.logger.log(level, 'Application error', logData);
  }
  
  /**
   * Get log level from severity
   */
  getLogLevel(severity) {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return 'error';
      case ErrorSeverity.HIGH: return 'error';
      case ErrorSeverity.MEDIUM: return 'warn';
      case ErrorSeverity.LOW: return 'info';
      default: return 'error';
    }
  }
  
  /**
   * Track error statistics
   */
  trackError(error) {
    this.errorStats.total++;
    
    // By code
    const codeCount = this.errorStats.byCode.get(error.code) || 0;
    this.errorStats.byCode.set(error.code, codeCount + 1);
    
    // By category
    const categoryCount = this.errorStats.byCategory.get(error.category) || 0;
    this.errorStats.byCategory.set(error.category, categoryCount + 1);
    
    // By severity
    const severityCount = this.errorStats.bySeverity.get(error.severity) || 0;
    this.errorStats.bySeverity.set(error.severity, severityCount + 1);
  }
  
  /**
   * Get error statistics
   */
  getStatistics() {
    return {
      total: this.errorStats.total,
      byCode: Object.fromEntries(this.errorStats.byCode),
      byCategory: Object.fromEntries(this.errorStats.byCategory),
      bySeverity: Object.fromEntries(this.errorStats.bySeverity)
    };
  }
  
  /**
   * Reset statistics
   */
  resetStatistics() {
    this.errorStats = {
      total: 0,
      byCode: new Map(),
      byCategory: new Map(),
      bySeverity: new Map()
    };
  }
}

// Singleton instance
let errorHandlerInstance = null;

/**
 * Get error handler instance
 */
function getErrorHandler(options) {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandler(options);
  }
  return errorHandlerInstance;
}

module.exports = {
  // Error classes
  ApplicationError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ResourceError,
  DatabaseError,
  ExternalServiceError,
  BusinessError,
  SecurityError,
  
  // Error handler
  ErrorHandler,
  getErrorHandler,
  
  // Constants
  ErrorCodes,
  ErrorSeverity,
  ErrorCategory
};
