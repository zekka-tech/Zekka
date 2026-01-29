/**
 * Request Validation Middleware
 *
 * Provides centralized input validation for API endpoints using Joi schemas.
 * Ensures consistent validation across all routes and returns user-friendly
 * error messages.
 *
 * @module middleware/validation
 * @requires joi - Schema validation library
 *
 * @description
 * This middleware:
 * - Validates request body, query params, and URL params
 * - Provides reusable validation schemas for common data types
 * - Returns consistent error responses with field-level details
 * - Strips unknown fields to prevent injection attacks
 *
 * @example
 * // Use in a route
 * const { validateBody, schemas } = require('./middleware/validation');
 *
 * app.post('/api/projects',
 *   validateBody(schemas.createProject),
 *   async (req, res) => {
 *     // req.body is validated and sanitized
 *   }
 * );
 *
 * @author Zekka Technologies
 * @version 1.0.0
 * @since 2.0.0
 */

const Joi = require('joi');

/**
 * Common validation schemas for API endpoints.
 *
 * @namespace schemas
 * @description
 * Pre-defined Joi schemas for validating common request types.
 * Use these with the validation middleware functions.
 */
const schemas = {
  /**
   * Schema for creating a new project.
   *
   * @memberof schemas
   * @type {Joi.ObjectSchema}
   *
   * @property {string} name - Project name (3-100 chars)
   * @property {string[]} requirements - Array of requirement strings
   * @property {number} [storyPoints=8] - Story points estimate (1-100)
   * @property {Object} [budget] - Budget configuration
   * @property {number} [budget.daily=50] - Daily budget limit
   * @property {number} [budget.monthly=1000] - Monthly budget limit
   */
  createProject: Joi.object({
    name: Joi.string().min(3).max(100).required()
      .trim()
      .messages({
        'string.min': 'Project name must be at least 3 characters',
        'string.max': 'Project name cannot exceed 100 characters',
        'any.required': 'Project name is required'
      }),

    requirements: Joi.array()
      .items(Joi.string().min(5).max(500).trim())
      .min(1)
      .max(50)
      .required()
      .messages({
        'array.min': 'At least one requirement is required',
        'array.max': 'Maximum 50 requirements allowed',
        'any.required': 'Requirements array is required'
      }),

    storyPoints: Joi.number().integer().min(1).max(100)
      .default(8)
      .messages({
        'number.min': 'Story points must be at least 1',
        'number.max': 'Story points cannot exceed 100'
      }),

    budget: Joi.object({
      daily: Joi.number().min(0).max(10000).default(50),
      monthly: Joi.number().min(0).max(100000).default(1000)
    }).default()
  }),

  /**
   * Schema for project ID parameter validation.
   *
   * @memberof schemas
   * @type {Joi.ObjectSchema}
   */
  projectId: Joi.object({
    projectId: Joi.string()
      .pattern(/^proj-[a-f0-9]{8}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid project ID format',
        'any.required': 'Project ID is required'
      })
  }),

  /**
   * Schema for user registration.
   *
   * @memberof schemas
   * @type {Joi.ObjectSchema}
   */
  register: Joi.object({
    email: Joi.string()
      .email({ minDomainSegments: 2 })
      .required()
      .lowercase()
      .trim()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),

    password: Joi.string().min(12).required().messages({
      'string.min': 'Password must be at least 12 characters',
      'any.required': 'Password is required'
    }),

    name: Joi.string().min(2).max(100).required()
      .trim()
      .messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 100 characters',
        'any.required': 'Name is required'
      })
  }),

  /**
   * Schema for user login.
   *
   * @memberof schemas
   * @type {Joi.ObjectSchema}
   */
  login: Joi.object({
    email: Joi.string().email().required().lowercase()
      .trim()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),

    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),

  /**
   * Schema for cost query parameters.
   *
   * @memberof schemas
   * @type {Joi.ObjectSchema}
   */
  costQuery: Joi.object({
    projectId: Joi.string()
      .pattern(/^proj-[a-f0-9]{8}$/)
      .optional(),

    period: Joi.string().valid('daily', 'weekly', 'monthly').default('daily')
  }),

  /**
   * Schema for pagination query parameters.
   *
   * @memberof schemas
   * @type {Joi.ObjectSchema}
   */
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100)
      .default(20),
    sortBy: Joi.string()
      .valid('created_at', 'updated_at', 'name', 'status')
      .default('created_at'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Create validation middleware for request body.
 *
 * @param {Joi.ObjectSchema} schema - Joi schema to validate against
 * @param {Object} [options={}] - Validation options
 * @param {boolean} [options.stripUnknown=true] - Remove unknown fields
 * @returns {Function} Express middleware function
 *
 * @example
 * app.post('/api/resource', validateBody(mySchema), handler);
 */
function validateBody(schema, options = {}) {
  const { stripUnknown = true } = options;

  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }

    // Replace body with validated and sanitized value
    req.body = value;
    next();
  };
}

/**
 * Create validation middleware for query parameters.
 *
 * @param {Joi.ObjectSchema} schema - Joi schema to validate against
 * @param {Object} [options={}] - Validation options
 * @returns {Function} Express middleware function
 *
 * @example
 * app.get('/api/resource', validateQuery(paginationSchema), handler);
 */
function validateQuery(schema, options = {}) {
  const { stripUnknown = true } = options;

  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }

    req.query = value;
    next();
  };
}

/**
 * Create validation middleware for URL parameters.
 *
 * @param {Joi.ObjectSchema} schema - Joi schema to validate against
 * @returns {Function} Express middleware function
 *
 * @example
 * app.get('/api/resource/:id', validateParams(idSchema), handler);
 */
function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Invalid URL parameters',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }

    req.params = value;
    next();
  };
}

/**
 * Sanitize a string by removing potential XSS vectors.
 *
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Create custom Joi extension for sanitized strings.
 *
 * @type {Joi.Extension}
 */
const sanitizedString = Joi.string().custom((value, helpers) => sanitizeString(value));

module.exports = {
  // Middleware functions
  validateBody,
  validateQuery,
  validateParams,

  // Pre-defined schemas
  schemas,

  // Utilities
  sanitizeString,
  sanitizedString,

  // Re-export Joi for custom schema creation
  Joi
};
