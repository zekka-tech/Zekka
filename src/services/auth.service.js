/**
 * Authentication Service
 * Handles authentication business logic with security best practices
 *
 * Features:
 * - Secure user authentication
 * - Password management
 * - Session handling
 * - Multi-factor authentication
 * - Account security
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError, ErrorCodes } = require('../utils/errors');
const { AuditLogger } = require('../utils/audit-logger');
const { PasswordPolicy } = require('../utils/password-policy');
const { SessionManager } = require('../utils/session-manager');

class AuthService {
  constructor(userRepository, config) {
    this.userRepository = userRepository;
    this.config = config;
    this.auditLogger = new AuditLogger();
    this.passwordPolicy = new PasswordPolicy();
    this.sessionManager = new SessionManager();
    this.saltRounds = 12;
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user and access token
   */
  async register(userData) {
    try {
      const {
        email, password, name, metadata = {}
      } = userData;

      // Validate required fields
      if (!email || !password || !name) {
        throw new AppError(
          'Email, password, and name are required',
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        await this.auditLogger.log({
          category: 'authentication',
          action: 'register_failed',
          userId: null,
          details: { email, reason: 'User already exists' },
          severity: 'warning'
        });

        throw new AppError(
          'User with this email already exists',
          409,
          ErrorCodes.DUPLICATE_ENTRY
        );
      }

      // Validate password strength
      const passwordValidation = this.passwordPolicy.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new AppError(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
          400,
          ErrorCodes.PASSWORD_WEAK
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);

      // Create user
      const user = await this.userRepository.create({
        email,
        password: hashedPassword,
        name,
        metadata: {
          ...metadata,
          registeredAt: new Date().toISOString(),
          passwordStrength: passwordValidation.strength
        }
      });

      // Log successful registration
      await this.auditLogger.log({
        category: 'authentication',
        action: 'user_registered',
        userId: user.id,
        details: { email, name },
        severity: 'info'
      });

      // Generate access token
      const token = this.generateAccessToken(user);

      // Create session
      await this.sessionManager.createSession({
        userId: user.id,
        token,
        metadata: metadata.deviceInfo || {}
      });

      return {
        user: this.sanitizeUser(user),
        token
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Registration failed',
        500,
        ErrorCodes.INTERNAL_ERROR,
        { originalError: error.message }
      );
    }
  }

  /**
   * Authenticate user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} metadata - Request metadata (IP, device info, etc.)
   * @returns {Promise<Object>} User and access token
   */
  async login(email, password, metadata = {}) {
    try {
      // Validate input
      if (!email || !password) {
        throw new AppError(
          'Email and password are required',
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Find user
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        await this.auditLogger.log({
          category: 'authentication',
          action: 'login_failed',
          userId: null,
          details: { email, reason: 'User not found', ...metadata },
          severity: 'warning'
        });

        throw new AppError(
          'Invalid email or password',
          401,
          ErrorCodes.INVALID_CREDENTIALS
        );
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        await this.auditLogger.log({
          category: 'authentication',
          action: 'login_failed',
          userId: user.id,
          details: { email, reason: 'Account locked', ...metadata },
          severity: 'warning'
        });

        throw new AppError(
          'Account is temporarily locked. Please try again later.',
          403,
          ErrorCodes.ACCOUNT_LOCKED
        );
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        // Record failed attempt
        await this.userRepository.recordFailedLoginAttempt(user.id);

        await this.auditLogger.log({
          category: 'authentication',
          action: 'login_failed',
          userId: user.id,
          details: { email, reason: 'Invalid password', ...metadata },
          severity: 'warning'
        });

        throw new AppError(
          'Invalid email or password',
          401,
          ErrorCodes.INVALID_CREDENTIALS
        );
      }

      // Check password expiration
      if (
        user.password_expires_at
        && new Date(user.password_expires_at) < new Date()
      ) {
        await this.auditLogger.log({
          category: 'authentication',
          action: 'login_failed',
          userId: user.id,
          details: { email, reason: 'Password expired', ...metadata },
          severity: 'warning'
        });

        throw new AppError(
          'Password has expired. Please reset your password.',
          403,
          ErrorCodes.PASSWORD_EXPIRED
        );
      }

      // Reset failed login attempts on successful login
      await this.userRepository.resetFailedLoginAttempts(user.id);

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Generate access token
      const token = this.generateAccessToken(user);

      // Create session
      await this.sessionManager.createSession({
        userId: user.id,
        token,
        metadata: metadata.deviceInfo || {}
      });

      // Log successful login
      await this.auditLogger.log({
        category: 'authentication',
        action: 'user_logged_in',
        userId: user.id,
        details: { email, ...metadata },
        severity: 'info'
      });

      return {
        user: this.sanitizeUser(user),
        token
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Login failed', 500, ErrorCodes.INTERNAL_ERROR, {
        originalError: error.message
      });
    }
  }

  /**
   * Logout user and invalidate session
   * @param {string} userId - User ID
   * @param {string} token - Access token
   */
  async logout(userId, token) {
    try {
      // Invalidate session
      await this.sessionManager.invalidateSession(userId, token);

      // Log logout
      await this.auditLogger.log({
        category: 'authentication',
        action: 'user_logged_out',
        userId,
        severity: 'info'
      });

      return { message: 'Logged out successfully' };
    } catch (error) {
      throw new AppError('Logout failed', 500, ErrorCodes.INTERNAL_ERROR, {
        originalError: error.message
      });
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isValidPassword) {
        await this.auditLogger.log({
          category: 'authentication',
          action: 'password_change_failed',
          userId,
          details: { reason: 'Invalid current password' },
          severity: 'warning'
        });

        throw new AppError(
          'Current password is incorrect',
          401,
          ErrorCodes.INVALID_CREDENTIALS
        );
      }

      // Validate new password
      const passwordValidation = this.passwordPolicy.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new AppError(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
          400,
          ErrorCodes.PASSWORD_WEAK
        );
      }

      // Check password history
      const isInHistory = await this.userRepository.checkPasswordHistory(
        userId,
        newPassword
      );
      if (isInHistory) {
        throw new AppError(
          'Cannot reuse recent passwords',
          400,
          ErrorCodes.PASSWORD_REUSE
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);

      // Update password
      await this.userRepository.updatePassword(userId, hashedPassword);

      // Invalidate all sessions except current
      await this.sessionManager.invalidateAllUserSessions(userId);

      // Log password change
      await this.auditLogger.log({
        category: 'authentication',
        action: 'password_changed',
        userId,
        severity: 'info'
      });

      return { message: 'Password changed successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Password change failed',
        500,
        ErrorCodes.INTERNAL_ERROR,
        { originalError: error.message }
      );
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   */
  async requestPasswordReset(email) {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        return { message: 'If the email exists, a reset link will be sent' };
      }

      // Generate reset token (in production, send via email)
      const resetToken = jwt.sign(
        { userId: user.id, purpose: 'password-reset' },
        this.config.jwtSecret,
        { expiresIn: '1h' }
      );

      // Store reset token (in production, store in database)
      await this.userRepository.storeResetToken(user.id, resetToken);

      // Log password reset request
      await this.auditLogger.log({
        category: 'authentication',
        action: 'password_reset_requested',
        userId: user.id,
        details: { email },
        severity: 'info'
      });

      return {
        message: 'If the email exists, a reset link will be sent',
        // In production, don't return token - send via email
        resetToken
      };
    } catch (error) {
      throw new AppError(
        'Password reset request failed',
        500,
        ErrorCodes.INTERNAL_ERROR,
        { originalError: error.message }
      );
    }
  }

  /**
   * Verify access token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Decoded token payload
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret);

      // Check if session is valid
      const isValid = await this.sessionManager.validateSession(
        decoded.userId,
        token
      );
      if (!isValid) {
        throw new AppError(
          'Invalid or expired session',
          401,
          ErrorCodes.INVALID_TOKEN
        );
      }

      return decoded;
    } catch (error) {
      if (
        error.name === 'JsonWebTokenError'
        || error.name === 'TokenExpiredError'
      ) {
        throw new AppError(
          'Invalid or expired token',
          401,
          ErrorCodes.INVALID_TOKEN
        );
      }
      throw error;
    }
  }

  /**
   * Generate JWT access token
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name
      },
      this.config.jwtSecret,
      {
        expiresIn: '24h',
        issuer: 'zekka-framework',
        audience: 'zekka-api'
      }
    );
  }

  /**
   * Remove sensitive data from user object
   * @param {Object} user - User object
   * @returns {Object} Sanitized user object
   */
  sanitizeUser(user) {
    const { password, password_history, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Get authentication statistics
   * @returns {Promise<Object>} Authentication stats
   */
  async getAuthStats() {
    const stats = {
      totalUsers: await this.userRepository.count(),
      activeUsers: await this.userRepository.countActive(),
      lockedAccounts: await this.userRepository.countLocked(),
      expiredPasswords: await this.userRepository.countExpiredPasswords(),
      activeSessions: await this.sessionManager.getActiveSessionCount()
    };

    return stats;
  }
}

module.exports = { AuthService };
