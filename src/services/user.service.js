/**
 * User Service Layer
 *
 * Separates business logic from routes and repositories
 * Provides reusable user-related operations
 */

const crypto = require('crypto');
const {
  getEnhancedUserRepository
} = require('../repositories/user.repository.enhanced');
const { getPasswordPolicyManager } = require('../utils/password-policy');
const { generateToken } = require('../middleware/auth.secure');
const { getAuditLogger } = require('../utils/audit-logger');
const emailService = require('./email.service');
const pool = require('../config/database');
const {
  ValidationError,
  AuthenticationError,
  BusinessError,
  ErrorCodes
} = require('../utils/error-handler-enhanced');

class UserService {
  constructor() {
    this.userRepository = getEnhancedUserRepository();
    this.passwordPolicy = getPasswordPolicyManager();
    this.auditLogger = getAuditLogger();
  }

  /**
   * Register a new user
   */
  async registerUser(userData, context = {}) {
    const {
      email, password, name, metadata
    } = userData;

    // Validate required fields
    if (!email || !password || !name) {
      throw new ValidationError(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        'Email, password, and name are required',
        {
          field: !email ? 'email' : !password ? 'password' : 'name',
          recoverySuggestion: 'Please provide all required fields'
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError(
        ErrorCodes.INVALID_EMAIL,
        'Invalid email format',
        {
          field: 'email',
          value: email,
          recoverySuggestion: 'Please provide a valid email address'
        }
      );
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new BusinessError(
        ErrorCodes.ALREADY_EXISTS,
        'User with this email already exists',
        {
          field: 'email',
          recoverySuggestion:
            'Please use a different email or login with existing account'
        }
      );
    }

    // Validate password
    const passwordValidation = this.passwordPolicy.validatePassword(password, {
      email,
      name
    });
    if (!passwordValidation.isValid) {
      throw new ValidationError(
        ErrorCodes.WEAK_PASSWORD,
        'Password does not meet requirements',
        {
          field: 'password',
          errors: passwordValidation.errors,
          suggestions: passwordValidation.suggestions,
          strengthScore: passwordValidation.strengthScore,
          recoverySuggestion: 'Please choose a stronger password'
        }
      );
    }

    // Create user
    try {
      const user = await this.userRepository.createUser(
        email,
        password,
        name,
        metadata
      );

      // Audit log
      this.auditLogger.logAuthentication(
        'user_registered',
        'success',
        { userId: user.id, email: user.email },
        {
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          requestId: context.requestId
        }
      );

      // Generate JWT token
      const token = generateToken(user.id, user.email);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at
        },
        token
      };
    } catch (error) {
      this.auditLogger.logAuthentication(
        'user_registration_failed',
        'failure',
        { email },
        {
          error: error.message,
          ipAddress: context.ipAddress,
          requestId: context.requestId
        }
      );
      throw error;
    }
  }

  /**
   * Authenticate user
   */
  async authenticateUser(credentials, context = {}) {
    const { email, password } = credentials;

    // Validate required fields
    if (!email || !password) {
      throw new ValidationError(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        'Email and password are required',
        {
          field: !email ? 'email' : 'password',
          recoverySuggestion: 'Please provide both email and password'
        }
      );
    }

    try {
      // Authenticate
      const user = await this.userRepository.authenticate(email, password);

      if (!user) {
        // Audit failed login
        this.auditLogger.logAuthentication(
          'login_failed',
          'failure',
          { email },
          {
            reason: 'invalid_credentials',
            ipAddress: context.ipAddress,
            requestId: context.requestId
          }
        );

        throw new AuthenticationError(
          ErrorCodes.INVALID_CREDENTIALS,
          'Invalid email or password',
          {
            recoverySuggestion: 'Please check your credentials and try again'
          }
        );
      }

      // Check password expiration
      if (
        user.passwordExpiresAt
        && new Date() > new Date(user.passwordExpiresAt)
      ) {
        this.auditLogger.logAuthentication(
          'login_blocked_password_expired',
          'failure',
          { userId: user.id, email: user.email },
          {
            ipAddress: context.ipAddress,
            requestId: context.requestId
          }
        );

        throw new AuthenticationError(
          ErrorCodes.PASSWORD_EXPIRED,
          'Your password has expired',
          {
            mustChangePassword: true,
            recoverySuggestion: 'Please reset your password to continue'
          }
        );
      }

      // Audit successful login
      this.auditLogger.logAuthentication(
        'login_success',
        'success',
        { userId: user.id, email: user.email },
        {
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          requestId: context.requestId
        }
      );

      // Generate JWT token
      const token = generateToken(user.id, user.email);

      // Check if password expiration warning needed
      const policy = this.passwordPolicy.getPolicy();
      const daysUntilExpiration = this.passwordPolicy.getDaysUntilExpiration(
        user.passwordChangedAt
      );
      const shouldWarn = daysUntilExpiration !== null
        && daysUntilExpiration <= policy.warnDaysBefore;

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          mustChangePassword: user.mustChangePassword
        },
        token,
        ...(shouldWarn && {
          warning: {
            type: 'password_expiring',
            message: `Your password will expire in ${Math.ceil(daysUntilExpiration)} days`,
            daysRemaining: Math.ceil(daysUntilExpiration)
          }
        })
      };
    } catch (error) {
      // Re-throw if already an application error
      if (error.isOperational) {
        throw error;
      }

      // Wrap unexpected errors
      this.auditLogger.logAuthentication(
        'login_error',
        'failure',
        { email },
        {
          error: error.message,
          ipAddress: context.ipAddress,
          requestId: context.requestId
        }
      );

      throw new AuthenticationError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Authentication failed',
        {
          originalError: error,
          recoverySuggestion: 'Please try again later'
        }
      );
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId, context = {}) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ResourceError(ErrorCodes.NOT_FOUND, 'User not found', {
        resource: 'user',
        resourceId: userId
      });
    }

    // Audit data access
    this.auditLogger.logDataAccess(
      'get_user',
      { userId: context.currentUserId },
      `user:${userId}`,
      {
        requestId: context.requestId
      }
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.is_active,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      passwordExpiresAt: user.password_expires_at,
      mustChangePassword: user.must_change_password
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId, oldPassword, newPassword, context = {}) {
    // Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ResourceError(ErrorCodes.NOT_FOUND, 'User not found');
    }

    // Verify old password
    const isValid = await this.passwordPolicy.verifyPassword(
      oldPassword,
      user.password_hash
    );
    if (!isValid) {
      this.auditLogger.logSecurityEvent(
        'password_change_failed',
        'warning',
        'failure',
        { userId },
        {
          reason: 'invalid_old_password',
          requestId: context.requestId
        }
      );

      throw new AuthenticationError(
        ErrorCodes.INVALID_CREDENTIALS,
        'Current password is incorrect',
        {
          field: 'oldPassword',
          recoverySuggestion: 'Please provide your current password'
        }
      );
    }

    // Change password
    try {
      await this.userRepository.changePassword(userId, newPassword, {
        email: user.email,
        name: user.name
      });

      this.auditLogger.logSecurityEvent(
        'password_changed',
        'info',
        'success',
        { userId, email: user.email },
        {
          requestId: context.requestId,
          ipAddress: context.ipAddress
        }
      );

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      this.auditLogger.logSecurityEvent(
        'password_change_failed',
        'error',
        'failure',
        { userId },
        {
          error: error.message,
          requestId: context.requestId
        }
      );
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email, context = {}) {
    const user = await this.userRepository.findByEmail(email);

    // Always return success to prevent email enumeration
    const response = {
      success: true,
      message:
        'If an account exists with this email, a password reset link has been sent'
    };

    if (user) {
      try {
        // Generate secure reset token using crypto.randomBytes (32 bytes = 256 bits)
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Set expiration time (1 hour from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        // Store reset token in database
        await pool.query(
          `INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id)
           DO UPDATE SET token = $2, expires_at = $3, ip_address = $4, created_at = NOW(), used = false`,
          [user.id, resetToken, expiresAt, context.ipAddress || null]
        );

        // Send password reset email
        try {
          await emailService.sendPasswordResetEmail(user.email, resetToken);
        } catch (emailError) {
          this.auditLogger.logSecurityEvent(
            'password_reset_email_failed',
            'error',
            'failure',
            { userId: user.id, email, error: emailError.message },
            {
              requestId: context.requestId,
              ipAddress: context.ipAddress
            }
          );
          // Don't throw - token is saved, continue
        }

        this.auditLogger.logSecurityEvent(
          'password_reset_requested',
          'info',
          'success',
          { userId: user.id, email },
          {
            requestId: context.requestId,
            ipAddress: context.ipAddress
          }
        );
      } catch (error) {
        this.auditLogger.logSecurityEvent(
          'password_reset_request_failed',
          'error',
          'failure',
          { email, error: error.message },
          {
            requestId: context.requestId,
            ipAddress: context.ipAddress
          }
        );
        // Don't throw - maintain security by not revealing if user exists
      }
    } else {
      this.auditLogger.logSecurityEvent(
        'password_reset_requested_invalid_email',
        'warning',
        'failure',
        { email },
        {
          requestId: context.requestId,
          ipAddress: context.ipAddress
        }
      );
    }

    return response;
  }
}

// Singleton instance
let userServiceInstance = null;

/**
 * Get user service instance
 */
function getUserService() {
  if (!userServiceInstance) {
    userServiceInstance = new UserService();
  }
  return userServiceInstance;
}

module.exports = {
  UserService,
  getUserService
};
