/**
 * Authentication Middleware - SECURE VERSION
 *
 * SECURITY FIXES:
 * - Phase 1: No default JWT secret (CRITICAL FIX)
 * - Phase 1: Database user storage instead of memory (CRITICAL FIX)
 * - Phase 2: Stronger password requirements (HIGH FIX)
 * - Phase 2: Account lockout after failed attempts
 * - Phase 2: Comprehensive audit logging
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const UserRepository = require('../repositories/user.repository');
const {
  AuthenticationError,
  ValidationError,
  RateLimitError
} = require('../utils/errors');
const logger = require('../utils/logger');

// Initialize user repository
const userRepository = new UserRepository();

// SECURITY FIX: No default secret - must be provided in environment
const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRATION = config.jwt.expiration;
const BCRYPT_ROUNDS = 12; // Increased from 10

/**
 * Hash password with bcrypt
 * SECURITY: Using 12 rounds (increased from 10)
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * SECURITY FIX: Phase 2 - Enforced password requirements
 */
function validatePassword(password) {
  const errors = [];

  if (password.length < config.password.minLength) {
    errors.push(
      `Password must be at least ${config.password.minLength} characters`
    );
  }

  if (config.password.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.password.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (
    config.password.requireSpecial
    && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
}

/**
 * Calculate password strength
 */
function calculatePasswordStrength(password) {
  let strength = 0;

  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 20;
  if (password.length >= 16) strength += 10;
  if (/[a-z]/.test(password)) strength += 10;
  if (/[A-Z]/.test(password)) strength += 10;
  if (/\d/.test(password)) strength += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 20;

  if (strength < 40) return 'weak';
  if (strength < 70) return 'medium';
  return 'strong';
}

/**
 * Generate JWT token
 * SECURITY: Uses configured secret (no default)
 */
function generateToken(userId, email) {
  return jwt.sign(
    {
      userId,
      email,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AuthenticationError(
        'Authentication required. Please provide a valid Bearer token in Authorization header'
      )
    );
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return next(
      new AuthenticationError('Invalid or expired token. Please login again')
    );
  }

  req.user = decoded;
  next();
}

/**
 * Optional authentication (doesn't fail if no token)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
}

/**
 * Register new user
 * SECURITY FIX: Phase 1 - Uses database storage
 * SECURITY FIX: Phase 2 - Enforces password requirements
 */
async function register(email, password, name) {
  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new ValidationError('Password does not meet requirements', {
      errors: passwordValidation.errors,
      strength: passwordValidation.strength
    });
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user in database
  const user = await userRepository.create({
    email,
    passwordHash,
    name
  });

  // Log audit event
  logAuditEvent('user.registered', {
    userId: user.id,
    email: user.email,
    timestamp: new Date().toISOString()
  });

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.created_at
  };
}

/**
 * Login user
 * SECURITY FIX: Phase 1 - Uses database storage
 * SECURITY FIX: Phase 2 - Account lockout protection
 */
async function login(email, password, ip = 'unknown') {
  // Check if account is locked
  const isLocked = await userRepository.isLocked(email);
  if (isLocked) {
    logAuditEvent('auth.blocked', {
      email,
      reason: 'account_locked',
      ip,
      timestamp: new Date().toISOString()
    });
    throw new RateLimitError(
      'Account temporarily locked due to too many failed login attempts. Please try again later.'
    );
  }

  // Find user
  const user = await userRepository.findByEmail(email);

  if (!user) {
    // Don't reveal if user exists
    logAuditEvent('auth.failed', {
      email,
      reason: 'invalid_credentials',
      ip,
      timestamp: new Date().toISOString()
    });
    throw new AuthenticationError('Invalid credentials');
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    // Increment failed attempts
    const attempts = await userRepository.incrementFailedAttempts(email);

    logAuditEvent('auth.failed', {
      email,
      reason: 'invalid_password',
      attempts: attempts.failed_login_attempts,
      ip,
      timestamp: new Date().toISOString()
    });

    if (attempts.locked_until) {
      throw new RateLimitError(
        'Too many failed login attempts. Account locked for 15 minutes.'
      );
    }

    throw new AuthenticationError('Invalid credentials');
  }

  // Reset failed attempts on successful login
  await userRepository.resetFailedAttempts(email);

  // Generate token
  const token = generateToken(user.id, user.email);

  // Log successful login
  logAuditEvent('auth.success', {
    userId: user.id,
    email: user.email,
    ip,
    timestamp: new Date().toISOString()
  });

  return {
    token,
    expiresIn: JWT_EXPIRATION,
    user: {
      userId: user.id,
      email: user.email,
      name: user.name,
      mfaEnabled: user.mfa_enabled
    }
  };
}

/**
 * Get user by ID
 * SECURITY FIX: Phase 1 - Uses database storage
 */
async function getUser(userId) {
  return await userRepository.findById(userId);
}

/**
 * Audit logging
 * SECURITY FIX: Phase 2 - Comprehensive audit trail
 */
function logAuditEvent(event, details) {
  const auditLog = {
    event,
    ...details,
    timestamp: new Date().toISOString()
  };

  // Log to console (in production, send to audit log service)
  logger.info('🔒 AUDIT:', JSON.stringify(auditLog));

  // TODO: Send to dedicated audit logging service (ELK, Splunk, etc.)
}

module.exports = {
  authenticate,
  optionalAuth,
  register,
  login,
  getUser,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  validatePassword,
  logAuditEvent
};
