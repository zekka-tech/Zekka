/**
 * Validation Schemas
 *
 * SECURITY FIX: Phase 1 - Input validation
 */

const { body, param, query } = require('express-validator');

// User validation schemas
const registerSchema = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Password must contain at least one special character'),

  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      'Name can only contain letters, spaces, hyphens, and apostrophes'
    )
];

const loginSchema = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  body('password').notEmpty().withMessage('Password is required')
];

// Project validation schemas
const createProjectSchema = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Project name must be between 1 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,!?]+$/)
    .withMessage('Project name contains invalid characters'),

  body('requirements')
    .isArray({ min: 1 })
    .withMessage('At least one requirement is required'),

  body('requirements.*')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Each requirement must be between 1 and 1000 characters'),

  body('storyPoints')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Story points must be between 1 and 100'),

  body('budget.daily')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Daily budget must be positive'),

  body('budget.monthly')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly budget must be positive')
];

const projectIdSchema = [
  param('projectId')
    .trim()
    .matches(/^proj_[a-zA-Z0-9]+$/)
    .withMessage('Invalid project ID format')
];

// Cost query validation
const costQuerySchema = [
  query('projectId')
    .optional()
    .trim()
    .matches(/^proj_[a-zA-Z0-9]+$/)
    .withMessage('Invalid project ID format'),

  query('period')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Period must be daily, weekly, or monthly')
];

module.exports = {
  registerSchema,
  loginSchema,
  createProjectSchema,
  projectIdSchema,
  costQuerySchema
};
