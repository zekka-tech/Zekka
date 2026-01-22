/**
 * Authentication Test Helper
 * Utilities for generating tokens and auth data in tests
 */

const jwt = require('jsonwebtoken');
const { faker } = require('@faker-js/faker');

/**
 * Generate test JWT token
 */
function generateToken(payload = {}, options = {}) {
  const defaultPayload = {
    userId: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName()
  };

  const defaultOptions = {
    expiresIn: '24h',
    issuer: 'zekka-framework',
    audience: 'zekka-api'
  };

  return jwt.sign(
    { ...defaultPayload, ...payload },
    process.env.JWT_SECRET,
    { ...defaultOptions, ...options }
  );
}

/**
 * Generate expired token
 */
function generateExpiredToken(payload = {}) {
  return generateToken(payload, { expiresIn: '-1h' });
}

/**
 * Generate invalid token
 */
function generateInvalidToken() {
  return 'invalid.jwt.token';
}

/**
 * Decode token without verification
 */
function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Verify token
 */
function verifyToken(token, secret = process.env.JWT_SECRET) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

/**
 * Generate auth header
 */
function generateAuthHeader(token = null) {
  const authToken = token || generateToken();
  return {
    authorization: `Bearer ${authToken}`
  };
}

/**
 * Generate basic auth credentials
 */
function generateBasicAuth(username = 'test', password = 'test123') {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  return {
    authorization: `Basic ${credentials}`
  };
}

/**
 * Create mock authenticated user
 */
function createAuthUser(overrides = {}) {
  return {
    userId: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: 'user',
    ...overrides
  };
}

/**
 * Create mock admin user
 */
function createAdminUser(overrides = {}) {
  return createAuthUser({ role: 'admin', ...overrides });
}

/**
 * Create mock request with auth
 */
function createAuthRequest(user = null, overrides = {}) {
  const authUser = user || createAuthUser();
  const token = generateToken(authUser);

  return {
    user: authUser,
    headers: {
      authorization: `Bearer ${token}`,
      ...overrides.headers
    },
    body: {},
    params: {},
    query: {},
    ...overrides
  };
}

/**
 * Create mock session data
 */
function createSessionData(userId = null, overrides = {}) {
  return {
    userId: userId || faker.string.uuid(),
    token: generateToken(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    metadata: {},
    ...overrides
  };
}

/**
 * Hash password (for testing)
 */
async function hashPassword(password) {
  const bcrypt = require('bcryptjs');
  return bcrypt.hash(password, 10);
}

/**
 * Compare password
 */
async function comparePassword(password, hash) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(password, hash);
}

/**
 * Generate refresh token
 */
function generateRefreshToken(payload = {}) {
  return generateToken(payload, { expiresIn: '7d' });
}

/**
 * Generate password reset token
 */
function generateResetToken(userId) {
  return generateToken(
    { userId, purpose: 'password-reset' },
    { expiresIn: '1h' }
  );
}

/**
 * Generate email verification token
 */
function generateVerificationToken(email) {
  return generateToken(
    { email, purpose: 'email-verification' },
    { expiresIn: '24h' }
  );
}

/**
 * Mock authentication middleware
 */
function mockAuthMiddleware(user = null) {
  return (req, res, next) => {
    req.user = user || createAuthUser();
    next();
  };
}

/**
 * Mock admin middleware
 */
function mockAdminMiddleware(user = null) {
  return (req, res, next) => {
    req.user = user || createAdminUser();
    next();
  };
}

module.exports = {
  generateToken,
  generateExpiredToken,
  generateInvalidToken,
  decodeToken,
  verifyToken,
  generateAuthHeader,
  generateBasicAuth,
  createAuthUser,
  createAdminUser,
  createAuthRequest,
  createSessionData,
  hashPassword,
  comparePassword,
  generateRefreshToken,
  generateResetToken,
  generateVerificationToken,
  mockAuthMiddleware,
  mockAdminMiddleware
};
