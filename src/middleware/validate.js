/**
 * Validation Middleware Helper
 * Simple validation middleware that works with Joi schemas
 */

const { AppError } = require('../utils/errors');

/**
 * Validate request body against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(', ');
    return next(new AppError(errorMessage, 400));
  }

  req.body = value;
  return next();
};

/**
 * Validate request query parameters against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(', ');
    return next(new AppError(errorMessage, 400));
  }

  // Express 5 exposes req.query through a prototype getter, so direct
  // assignment throws "Cannot set property query ... which has only a
  // getter". Shadow it with an own data property holding the validated
  // values instead.
  Object.defineProperty(req, 'query', {
    value,
    writable: true,
    configurable: true,
    enumerable: true
  });
  return next();
};

/**
 * Validate request URL parameters against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateParams = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(', ');
    return next(new AppError(errorMessage, 400));
  }

  req.params = value;
  return next();
};

module.exports = {
  validateBody,
  validateQuery,
  validateParams
};
