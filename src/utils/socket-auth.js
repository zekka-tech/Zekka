/**
 * WebSocket Authentication Utility
 *
 * Handles JWT authentication for WebSocket connections
 * Extracts and verifies tokens from handshake queries or headers
 *
 * @module utils/socket-auth
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Extract JWT token from socket handshake
 * Checks query parameters and authorization header
 *
 * @param {Object} socket - Socket.IO socket instance
 * @returns {string|null} - JWT token or null if not found
 */
function extractToken(socket) {
  // Check query parameter (most common for WebSocket)
  if (socket.handshake.query && socket.handshake.query.token) {
    return socket.handshake.query.token;
  }

  // Check auth query parameter (alternative format)
  if (socket.handshake.query && socket.handshake.query.auth) {
    return socket.handshake.query.auth;
  }

  // Check authorization header
  if (socket.handshake.headers && socket.handshake.headers.authorization) {
    const authHeader = socket.handshake.headers.authorization;

    // Extract token from "Bearer <token>" format
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return authHeader;
  }

  // Check cookies (if available)
  if (socket.handshake.headers && socket.handshake.headers.cookie) {
    const cookies = socket.handshake.headers.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token' || name === 'jwt') {
        return value;
      }
    }
  }

  return null;
}

/**
 * Verify JWT token and extract user data
 *
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object>} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
async function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (err) {
        reject(new Error('Invalid or expired token'));
      } else {
        resolve(decoded);
      }
    });
  });
}

/**
 * Authenticate WebSocket connection
 * Middleware function for Socket.IO
 *
 * @param {Object} socket - Socket.IO socket instance
 * @param {Function} next - Next middleware function
 */
async function authenticateSocket(socket, next) {
  try {
    // Extract token from handshake
    const token = extractToken(socket);

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify token
    const decoded = await verifyToken(token);

    // Enrich socket with user context
    socket.user = {
      userId: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
      username: decoded.username || decoded.email?.split('@')[0] || 'user'
    };

    // Store connection metadata
    socket.metadata = {
      connectedAt: new Date().toISOString(),
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']
    };

    next();
  } catch (error) {
    next(new Error('Authentication failed: ' + error.message));
  }
}

/**
 * Optional authentication (allows unauthenticated connections)
 * Enriches socket with user data if token is present
 *
 * @param {Object} socket - Socket.IO socket instance
 * @param {Function} next - Next middleware function
 */
async function optionalSocketAuth(socket, next) {
  try {
    const token = extractToken(socket);

    if (token) {
      const decoded = await verifyToken(token);

      socket.user = {
        userId: decoded.userId || decoded.id,
        email: decoded.email,
        role: decoded.role || 'user',
        username: decoded.username || decoded.email?.split('@')[0] || 'user'
      };
    } else {
      // Allow anonymous connection
      socket.user = null;
    }

    socket.metadata = {
      connectedAt: new Date().toISOString(),
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']
    };

    next();
  } catch (error) {
    // If token is invalid, still allow connection but without user data
    socket.user = null;
    socket.metadata = {
      connectedAt: new Date().toISOString(),
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']
    };
    next();
  }
}

/**
 * Check if socket user has required role
 *
 * @param {Object} socket - Socket.IO socket instance
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {boolean} - True if user has required role
 */
function hasRole(socket, requiredRoles) {
  if (!socket.user) return false;

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return roles.includes(socket.user.role);
}

/**
 * Check if socket user is authenticated
 *
 * @param {Object} socket - Socket.IO socket instance
 * @returns {boolean} - True if user is authenticated
 */
function isAuthenticated(socket) {
  return socket.user && socket.user.userId;
}

/**
 * Get user ID from socket
 *
 * @param {Object} socket - Socket.IO socket instance
 * @returns {string|null} - User ID or null
 */
function getUserId(socket) {
  return socket.user?.userId || null;
}

module.exports = {
  extractToken,
  verifyToken,
  authenticateSocket,
  optionalSocketAuth,
  hasRole,
  isAuthenticated,
  getUserId
};
