/**
 * Jest Test Setup
 * Global configuration and utilities for testing
 * Comprehensive test environment setup with database mocking and utilities
 */

const { faker } = require('@faker-js/faker');

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
  },

  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be within range ${floor} - ${ceiling}`
        : `expected ${received} to be within range ${floor} - ${ceiling}`
    };
  }
});

// Global test timeout
jest.setTimeout(30000);

// Mock environment variables
require('dotenv').config();

// Set test environment overrides
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-purposes-only-12345678901234567890';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret-key-for-testing-purposes-only-1234567890';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '6430873680cd7f7a9aca0536fca10546eaac18300aa8e6337b21836e7c2a4ca7';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/zekka_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.VAULT_ADDR = 'http://localhost:8200';
process.env.VAULT_TOKEN = 'test-vault-token';
process.env.API_PORT = '3001';
process.env.VAULT_ENABLED = 'false';

// Mock database pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
};

// Mock Redis client
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn()
};

// Clean up after all tests
afterAll(async () => {
  // Close database connections
  if (mockPool.end) {
    await mockPool.end();
  }

  // Close Redis connections
  if (mockRedis.quit) {
    await mockRedis.quit();
  }

  // Clear all mocks
  jest.clearAllMocks();
});

// Clear mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  /**
   * Create a test user with faker data
   */
  createTestUser: (overrides = {}) => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    password: 'Test123!@#SecurePass',
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create a test JWT token
   */
  createTestToken: (payload = {}) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      {
        userId: faker.string.uuid(),
        email: faker.internet.email(),
        name: faker.person.fullName(),
        ...payload
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  },

  /**
   * Create a test project
   */
  createTestProject: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    owner_id: faker.string.uuid(),
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create a test conversation
   */
  createTestConversation: (overrides = {}) => ({
    id: faker.string.uuid(),
    project_id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create a test message
   */
  createTestMessage: (overrides = {}) => ({
    id: faker.string.uuid(),
    conversation_id: faker.string.uuid(),
    role: 'user',
    content: faker.lorem.paragraph(),
    model: 'claude-sonnet-4-5',
    tokens: faker.number.int({ min: 100, max: 1000 }),
    created_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create test analytics data
   */
  createTestAnalytics: (overrides = {}) => ({
    id: faker.string.uuid(),
    project_id: faker.string.uuid(),
    model: 'claude-sonnet-4-5',
    input_tokens: faker.number.int({ min: 100, max: 5000 }),
    output_tokens: faker.number.int({ min: 50, max: 2000 }),
    cost: faker.number.float({ min: 0.01, max: 1.0, fractionDigits: 4 }),
    timestamp: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Wait for a specific duration
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate random string
   */
  randomString: (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
  },

  /**
   * Generate random email
   */
  randomEmail: () => faker.internet.email(),

  /**
   * Generate random UUID
   */
  randomUUID: () => faker.string.uuid(),

  /**
   * Mock database response
   */
  mockDbResponse: (rows = []) => ({
    rows,
    rowCount: rows.length,
    command: 'SELECT',
    fields: []
  }),

  /**
   * Mock error response
   */
  mockError: (message = 'Test error', code = 'TEST_ERROR') => {
    const error = new Error(message);
    error.code = code;
    return error;
  },

  /**
   * Create mock repository
   */
  createMockRepository: () => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    countActive: jest.fn(),
    countLocked: jest.fn(),
    countExpiredPasswords: jest.fn(),
    recordFailedLoginAttempt: jest.fn(),
    resetFailedLoginAttempts: jest.fn(),
    updateLastLogin: jest.fn(),
    updatePassword: jest.fn(),
    storeResetToken: jest.fn(),
    checkPasswordHistory: jest.fn()
  }),

  /**
   * Create mock request object
   */
  createMockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides
  }),

  /**
   * Create mock response object
   */
  createMockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis()
    };
    return res;
  },

  /**
   * Create mock next function
   */
  createMockNext: () => jest.fn(),

  // Export mock instances
  mockPool,
  mockRedis,
  faker
};
