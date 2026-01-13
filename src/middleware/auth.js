/**
 * Authentication Middleware
 * JWT-based authentication for secured endpoints
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'zekka-framework-secret-key-change-in-production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

// In-memory user store (replace with database in production)
const users = new Map();

/**
 * Hash password
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

/**
 * Verify password
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
function generateToken(userId, email) {
  return jwt.sign(
    { userId, email },
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
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please provide a valid Bearer token in Authorization header'
    });
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      message: 'Please login again'
    });
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
 */
async function register(email, password, name) {
  if (users.has(email)) {
    throw new Error('User already exists');
  }
  
  const passwordHash = await hashPassword(password);
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const user = {
    userId,
    email,
    passwordHash,
    name,
    createdAt: new Date().toISOString()
  };
  
  users.set(email, user);
  
  return {
    userId,
    email,
    name,
    createdAt: user.createdAt
  };
}

/**
 * Login user
 */
async function login(email, password) {
  const user = users.get(email);
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  const isValid = await verifyPassword(password, user.passwordHash);
  
  if (!isValid) {
    throw new Error('Invalid credentials');
  }
  
  const token = generateToken(user.userId, user.email);
  
  return {
    token,
    user: {
      userId: user.userId,
      email: user.email,
      name: user.name
    }
  };
}

/**
 * Get user by ID
 */
function getUser(userId) {
  for (const user of users.values()) {
    if (user.userId === userId) {
      return {
        userId: user.userId,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      };
    }
  }
  return null;
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
  verifyToken
};
