/**
 * Rate Limit Middleware Unit Tests
 */

// Mock Redis first to prevent connection attempts
jest.mock('../../../src/config/redis.js', () => {
  return {
    sendCommand: jest.fn(),
    connect: jest.fn(),
    quit: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    connectRedis: jest.fn(),
    closeRedis: jest.fn(),
    healthCheck: jest.fn(),
    getStats: jest.fn(),
    CACHE_KEYS: {}
  };
});

// Mock rate-limit-redis
jest.mock('rate-limit-redis', () => {
  return {
    RedisStore: class MockRedisStore {
      constructor() {
        this.init = jest.fn();
        this.increment = jest.fn();
        this.decrement = jest.fn();
        this.resetKey = jest.fn();
      }
    }
  };
});

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
  return jest.fn((options) => {
    const middleware = (req, res, next) => {
      // Basic mock implementation
      if (req.rateLimit?.limit === Infinity) {
        return next();
      }
      // Simulate rate limit logic if needed, or just pass through
      next();
    };
    // Attach properties for testing
    middleware.options = options;
    return middleware;
  });
});

const rateLimit = require('../../../src/middleware/rateLimit');
const { createMockRequest, createMockResponse, createMockNext } = global.testUtils;

describe('Rate Limit Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
    jest.clearAllMocks();
  });

  describe('Exports', () => {
    it('should export all required rate limiters', () => {
      expect(rateLimit).toHaveProperty('authLimiter');
      expect(rateLimit).toHaveProperty('apiLimiter');
      expect(rateLimit).toHaveProperty('createProjectLimiter');
      expect(rateLimit).toHaveProperty('strictLimiter');
    });
  });

  describe('bypassForWhitelist', () => {
    it('should bypass rate limiting for whitelisted IPs', () => {
      const whitelist = ['127.0.0.1', '10.0.0.1'];
      const middleware = rateLimit.bypassForWhitelist(whitelist);
      
      req.ip = '127.0.0.1';
      middleware(req, res, next);
      
      expect(req.rateLimit).toBeDefined();
      expect(req.rateLimit.limit).toBe(Infinity);
      expect(next).toHaveBeenCalled();
    });

    it('should not bypass for non-whitelisted IPs', () => {
      const whitelist = ['127.0.0.1'];
      const middleware = rateLimit.bypassForWhitelist(whitelist);
      
      req.ip = '192.168.1.1';
      middleware(req, res, next);
      
      expect(req.rateLimit).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });
});
