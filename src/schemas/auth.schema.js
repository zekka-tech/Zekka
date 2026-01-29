/**
 * Authentication Validation Schemas
 * ==================================
 *
 * Joi validation schemas for authentication endpoints.
 * Enforces input validation, password strength, and email format.
 */

import Joi from 'joi';

/**
 * Password validation rules
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const passwordSchema = Joi.string()
  .min(12)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .required()
  .messages({
    'string.min': 'Password must be at least 12 characters long',
    'string.max': 'Password cannot exceed 128 characters',
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    'any.required': 'Password is required'
  });

/**
 * Email validation rules
 */
const emailSchema = Joi.string()
  .email({ minDomainSegments: 2, tlds: { allow: true } })
  .lowercase()
  .trim()
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  });

/**
 * Name validation rules
 */
const nameSchema = Joi.string().min(2).max(100).trim()
  .required()
  .messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 100 characters',
    'any.required': 'Name is required'
  });

/**
 * Registration validation schema
 */
export const registerSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: Joi.string()
    .valid('user', 'admin', 'moderator')
    .default('user')
    .messages({
      'any.only': 'Role must be one of: user, admin, moderator'
    })
}).options({ stripUnknown: true });

/**
 * Login validation schema
 */
export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
}).options({ stripUnknown: true });

/**
 * MFA verification schema
 */
export const mfaVerifySchema = Joi.object({
  tempToken: Joi.string().required().messages({
    'any.required': 'Temporary token is required'
  }),
  code: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': 'MFA code must be exactly 6 digits',
      'string.pattern.base': 'MFA code must contain only digits',
      'any.required': 'MFA code is required'
    })
}).options({ stripUnknown: true });

/**
 * MFA enable schema
 */
export const mfaEnableSchema = Joi.object({
  verificationCode: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': 'Verification code must be exactly 6 digits',
      'string.pattern.base': 'Verification code must contain only digits',
      'any.required': 'Verification code is required'
    })
}).options({ stripUnknown: true });

/**
 * MFA disable schema
 */
export const mfaDisableSchema = Joi.object({
  password: Joi.string().required().messages({
    'any.required': 'Password is required to disable MFA'
  })
}).options({ stripUnknown: true });

/**
 * Refresh token schema
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required'
  })
}).options({ stripUnknown: true });

/**
 * Logout schema
 */
export const logoutSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required'
  })
}).options({ stripUnknown: true });

/**
 * Forgot password schema
 */
export const forgotPasswordSchema = Joi.object({
  email: emailSchema
}).options({ stripUnknown: true });

/**
 * Reset password schema
 */
export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required'
  }),
  newPassword: passwordSchema
}).options({ stripUnknown: true });

/**
 * Change password schema
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: passwordSchema
}).options({ stripUnknown: true });

/**
 * Verify email schema
 */
export const verifyEmailSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Verification token is required'
  })
}).options({ stripUnknown: true });

/**
 * Resend verification email schema
 */
export const resendVerificationSchema = Joi.object({
  email: emailSchema
}).options({ stripUnknown: true });

export default {
  registerSchema,
  loginSchema,
  mfaVerifySchema,
  mfaEnableSchema,
  mfaDisableSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema
};
