/**
 * Authentication Middleware
 *
 * JWT-based authentication with PostgreSQL user persistence.
 * Provides secure user registration, login, and token management.
 *
 * @module middleware/auth
 * @requires jsonwebtoken - JWT token generation and verification
 * @requires bcryptjs - Password hashing with bcrypt
 * @requires pg - PostgreSQL client for user persistence
 * @requires joi - Input validation
 *
 * @description
 * This module handles all authentication concerns for the Zekka Framework:
 * - User registration with email/password validation
 * - Secure password hashing (bcrypt with cost factor 12)
 * - JWT token generation and verification
 * - Database-persisted user storage (PostgreSQL)
 * - Middleware for protected and optional auth routes
 *
 * @example
 * // Protect a route
 * app.get('/api/protected', authenticate, (req, res) => {
 *   console.log(req.user.userId); // Access authenticated user
 * });
 *
 * @example
 * // Optional auth (user may or may not be logged in)
 * app.get('/api/public', optionalAuth, (req, res) => {
 *   if (req.user) { // User is logged in }
 * });
 *
 * @security
 * - JWT tokens expire based on JWT_EXPIRATION env var (default: 24h)
 * - Passwords require minimum length, uppercase, numbers, and special chars
 * - Bcrypt cost factor of 12 provides strong hashing
 * - No default JWT secret - must be configured via environment
 *
 * @author Zekka Technologies
 * @version 2.0.0
 * @since 1.0.0
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const Joi = require('joi');

// Load configuration
const config = require('../config');
const logger = require('../utils/logger');

// Constants from configuration (no defaults for security-critical values)
const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRATION = config.jwt.expiration;

// Password policy from configuration
const PASSWORD_POLICY = {
  minLength: config.password.minLength,
  requireUppercase: config.password.requireUppercase,
  requireNumbers: config.password.requireNumbers,
  requireSpecial: config.password.requireSpecial
};

// Database connection pool for user persistence
const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.isProduction ? { rejectUnauthorized: false } : false,
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

/**
 * Input validation schemas using Joi
 * @private
 */
const schemas = {
  /**
   * Email validation schema
   * - Must be valid email format
   * - Converts to lowercase
   * - Trims whitespace
   */
  email: Joi.string()
    .email({ minDomainSegments: 2 })
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  /**
   * Password validation schema
   * - Minimum length from config (default: 12)
   * - Requires uppercase if configured
   * - Requires numbers if configured
   * - Requires special characters if configured
   */
  password: Joi.string()
    .min(PASSWORD_POLICY.minLength)
    .required()
    .custom((value, helpers) => {
      const errors = [];

      if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(value)) {
        errors.push('uppercase letter');
      }
      if (PASSWORD_POLICY.requireNumbers && !/\d/.test(value)) {
        errors.push('number');
      }
      if (
        PASSWORD_POLICY.requireSpecial
        && !/[!@#$%^&*(),.?":{}|<>]/.test(value)
      ) {
        errors.push('special character');
      }

      if (errors.length > 0) {
        return helpers.error('password.requirements', {
          missing: errors.join(', ')
        });
      }

      return value;
    })
    .messages({
      'string.min': `Password must be at least ${PASSWORD_POLICY.minLength} characters`,
      'any.required': 'Password is required',
      'password.requirements': 'Password must contain: {{#missing}}'
    }),

  /**
   * Name validation schema
   * - 2-100 characters
   * - Trims whitespace
   */
  name: Joi.string().min(2).max(100).required()
    .trim()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    })
};

/**
 * Initialize the users table in the database if it doesn't exist.
 * Called automatically when the module loads.
 *
 * @private
 * @async
 * @returns {Promise<void>}
 */
async function initializeUsersTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      email_verified BOOLEAN DEFAULT false,
      last_login TIMESTAMP WITH TIME ZONE,
      login_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
  `;

  try {
    await pool.query(createTableQuery);
    logger.info('✅ Users table initialized');
  } catch (error) {
    // Table might already exist, which is fine
    if (error.code !== '42P07') {
      // duplicate_table
      logger.error(
        '⚠️ Warning: Could not initialize users table:',
        error.message
      );
    }
  }
}

// Initialize table on module load
initializeUsersTable().catch((err) => logger.error('Failed to initialize users table:', err));

/**
 * Hash a password using bcrypt with a cost factor of 12.
 *
 * @async
 * @param {string} password - The plaintext password to hash
 * @returns {Promise<string>} The bcrypt hash of the password
 *
 * @example
 * const hash = await hashPassword('MySecurePassword123!');
 * // Returns: $2a$12$... (bcrypt hash)
 */
async function hashPassword(password) {
  // Cost factor of 12 provides good security/performance balance
  return await bcrypt.hash(password, 12);
}

/**
 * Verify a password against its bcrypt hash.
 *
 * @async
 * @param {string} password - The plaintext password to verify
 * @param {string} hash - The bcrypt hash to verify against
 * @returns {Promise<boolean>} True if password matches, false otherwise
 *
 * @example
 * const isValid = await verifyPassword('MyPassword', storedHash);
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for an authenticated user.
 *
 * @param {string} userId - The unique user identifier
 * @param {string} email - The user's email address
 * @param {Object} [additionalClaims={}] - Additional claims to include in the token
 * @returns {string} The signed JWT token
 *
 * @example
 * const token = generateToken('user_abc123', 'user@example.com');
 * // Use in Authorization header: Bearer <token>
 */
function generateToken(userId, email, additionalClaims = {}) {
  return jwt.sign(
    {
      userId,
      email,
      ...additionalClaims,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
}

/**
 * Verify and decode a JWT token.
 *
 * @param {string} token - The JWT token to verify
 * @returns {Object|null} The decoded token payload, or null if invalid
 *
 * @example
 * const decoded = verifyToken(token);
 * if (decoded) {
 *   console.log(decoded.userId, decoded.email);
 * }
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    // Log for debugging but don't expose details
    if (error.name === 'TokenExpiredError') {
      logger.debug('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      logger.debug('Invalid token');
    }
    return null;
  }
}

/**
 * Express middleware to require authentication.
 * Extracts and validates the Bearer token from the Authorization header.
 * Adds the decoded user to req.user if valid.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 *
 * @example
 * // Protect a route
 * app.get('/api/protected', authenticate, handler);
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      message: 'Please provide a valid Bearer token in Authorization header'
    });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'TOKEN_INVALID',
      message: 'Please login again to get a new token'
    });
  }

  req.user = decoded;
  next();
}

/**
 * Express middleware for optional authentication.
 * Does not fail if no token is provided, but will decode and attach
 * user to req.user if a valid token is present.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 *
 * @example
 * // Route works for both authenticated and anonymous users
 * app.get('/api/public', optionalAuth, handler);
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
 * Validate registration input data.
 *
 * @private
 * @param {string} email - Email to validate
 * @param {string} password - Password to validate
 * @param {string} name - Name to validate
 * @returns {Object} Validation result with value or error
 */
function validateRegistrationInput(email, password, name) {
  const schema = Joi.object({
    email: schemas.email,
    password: schemas.password,
    name: schemas.name
  });

  return schema.validate({ email, password, name }, { abortEarly: false });
}

/**
 * Register a new user in the database.
 *
 * @async
 * @param {string} email - User's email address (must be unique)
 * @param {string} password - User's password (must meet policy requirements)
 * @param {string} name - User's display name
 * @returns {Promise<Object>} The created user object (without password)
 * @throws {Error} If email already exists or validation fails
 *
 * @example
 * try {
 *   const user = await register('user@example.com', 'SecurePass123!', 'John Doe');
 *   console.log(user.userId, user.email);
 * } catch (error) {
 *   console.error(error.message);
 * }
 */
async function register(email, password, name) {
  // Validate input
  const { error, value } = validateRegistrationInput(email, password, name);
  if (error) {
    const messages = error.details.map((d) => d.message).join('; ');
    throw new Error(`Validation failed: ${messages}`);
  }

  const { email: validEmail, password: validPassword, name: validName } = value;

  // Check if user already exists
  const existingUser = await pool.query(
    'SELECT user_id FROM users WHERE email = $1',
    [validEmail]
  );

  if (existingUser.rows.length > 0) {
    throw new Error('An account with this email already exists');
  }

  // Generate unique user ID and hash password
  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const passwordHash = await hashPassword(validPassword);

  // Insert new user
  const result = await pool.query(
    `INSERT INTO users (user_id, email, password_hash, name)
     VALUES ($1, $2, $3, $4)
     RETURNING user_id, email, name, created_at`,
    [userId, validEmail, passwordHash, validName]
  );

  const user = result.rows[0];

  return {
    userId: user.user_id,
    email: user.email,
    name: user.name,
    createdAt: user.created_at
  };
}

/**
 * Authenticate a user and return a JWT token.
 *
 * @async
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} Object containing token and user info
 * @throws {Error} If credentials are invalid or account is locked
 *
 * @example
 * try {
 *   const { token, user } = await login('user@example.com', 'password');
 *   // Use token in Authorization header for subsequent requests
 * } catch (error) {
 *   console.error('Login failed:', error.message);
 * }
 */
async function login(email, password) {
  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email
  const result = await pool.query(
    `SELECT user_id, email, password_hash, name, is_active,
            login_attempts, locked_until
     FROM users WHERE email = $1`,
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    // Use generic message to prevent user enumeration
    throw new Error('Invalid email or password');
  }

  const user = result.rows[0];

  // Check if account is active
  if (!user.is_active) {
    throw new Error('Account is disabled. Please contact support.');
  }

  // Check if account is locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const lockRemaining = Math.ceil(
      (new Date(user.locked_until) - new Date()) / 60000
    );
    throw new Error(
      `Account is locked. Try again in ${lockRemaining} minutes.`
    );
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    // Increment failed login attempts
    const newAttempts = (user.login_attempts || 0) + 1;
    let lockedUntil = null;

    // Lock account after 5 failed attempts for 15 minutes
    if (newAttempts >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    await pool.query(
      'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE user_id = $3',
      [newAttempts, lockedUntil, user.user_id]
    );

    throw new Error('Invalid email or password');
  }

  // Reset login attempts and update last login on success
  await pool.query(
    `UPDATE users SET login_attempts = 0, locked_until = NULL,
     last_login = CURRENT_TIMESTAMP WHERE user_id = $1`,
    [user.user_id]
  );

  // Generate token
  const token = generateToken(user.user_id, user.email);

  return {
    token,
    expiresIn: JWT_EXPIRATION,
    user: {
      userId: user.user_id,
      email: user.email,
      name: user.name
    }
  };
}

/**
 * Get a user by their unique user ID.
 *
 * @async
 * @param {string} userId - The unique user identifier
 * @returns {Promise<Object|null>} The user object or null if not found
 *
 * @example
 * const user = await getUser('user_1234567890_abc');
 * if (user) {
 *   console.log(user.email, user.name);
 * }
 */
async function getUser(userId) {
  const result = await pool.query(
    `SELECT user_id, email, name, is_active, email_verified,
            last_login, created_at
     FROM users WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  return {
    userId: user.user_id,
    email: user.email,
    name: user.name,
    isActive: user.is_active,
    emailVerified: user.email_verified,
    lastLogin: user.last_login,
    createdAt: user.created_at
  };
}

/**
 * Get a user by their email address.
 *
 * @async
 * @param {string} email - The user's email address
 * @returns {Promise<Object|null>} The user object or null if not found
 */
async function getUserByEmail(email) {
  const normalizedEmail = email.toLowerCase().trim();

  const result = await pool.query(
    `SELECT user_id, email, name, is_active, email_verified,
            last_login, created_at
     FROM users WHERE email = $1`,
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  return {
    userId: user.user_id,
    email: user.email,
    name: user.name,
    isActive: user.is_active,
    emailVerified: user.email_verified,
    lastLogin: user.last_login,
    createdAt: user.created_at
  };
}

module.exports = {
  // Middleware
  authenticate,
  optionalAuth,

  // User operations
  register,
  login,
  getUser,
  getUserByEmail,

  // Utilities (for testing and advanced use)
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,

  // Database pool (for cleanup)
  pool
};
