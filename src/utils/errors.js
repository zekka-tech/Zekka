/**
 * Custom Error Classes
 *
 * SECURITY FIX: Phase 1 & 3 - Proper error handling
 */

class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400);
    this.details = details;
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = {}) {
    super(message, 500);
    this.details = details;
    this.name = 'DatabaseError';
  }
}

const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  PASSWORD_WEAK: 'PASSWORD_WEAK',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  PASSWORD_EXPIRED: 'PASSWORD_EXPIRED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PASSWORD_REUSE: 'PASSWORD_REUSE',
  INVALID_TOKEN: 'INVALID_TOKEN'
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ErrorCodes
};
