/**
 * Jest Test Setup
 * Global configuration and utilities for testing
 */

// Extend Jest matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be a valid UUID`
        : `expected ${received} to be a valid UUID`
    };
  },
  
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be a valid email`
        : `expected ${received} to be a valid email`
    };
  },
  
  toBeValidJWT(received) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtRegex.test(received);
    
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be a valid JWT`
        : `expected ${received} to be a valid JWT`
    };
  },
  
  toHaveStatusCode(response, expectedStatus) {
    const pass = response.status === expectedStatus;
    
    return {
      pass,
      message: () => pass
        ? `expected response not to have status ${expectedStatus}`
        : `expected response to have status ${expectedStatus} but got ${response.status}`
    };
  }
});

// Global test timeout
jest.setTimeout(30000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-12345';
process.env.SESSION_SECRET = 'test-session-secret-key-12345';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'zekka_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Clean up after all tests
afterAll(async () => {
  // Close database connections
  // Close Redis connections
  // Clean up test data
});

// Global test utilities
global.testUtils = {
  /**
   * Create a test user
   */
  createTestUser: (overrides = {}) => ({
    email: 'test@example.com',
    username: 'testuser',
    password: 'Test123!@#',
    role: 'user',
    ...overrides
  }),
  
  /**
   * Create a test JWT token
   */
  createTestToken: (payload = {}) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: '12345', email: 'test@example.com', ...payload },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },
  
  /**
   * Wait for a specific duration
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Generate random string
   */
  randomString: (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
  }
};
