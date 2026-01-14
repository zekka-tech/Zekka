/**
 * Circuit Breaker Pattern for External Services
 * 
 * PERFORMANCE FIX: Phase 3 - Circuit breakers for resilience
 */

const CircuitBreaker = require('opossum');

/**
 * Create circuit breaker with default options
 */
function createCircuitBreaker(asyncFunction, options = {}) {
  const defaultOptions = {
    timeout: options.timeout || 3000, // 3 seconds
    errorThresholdPercentage: options.errorThreshold || 50, // Open circuit at 50% failures
    resetTimeout: options.resetTimeout || 30000, // Try again after 30 seconds
    rollingCountTimeout: options.rollingTimeout || 10000,
    rollingCountBuckets: options.rollingBuckets || 10,
    name: options.name || 'circuit',
    enabled: options.enabled !== false
  };
  
  const breaker = new CircuitBreaker(asyncFunction, defaultOptions);
  
  // Event handlers
  breaker.on('success', (result) => {
    console.log(`✅ Circuit ${options.name}: Success`);
  });
  
  breaker.on('timeout', () => {
    console.warn(`⏱️  Circuit ${options.name}: Timeout`);
  });
  
  breaker.on('reject', () => {
    console.warn(`🚫 Circuit ${options.name}: Rejected`);
  });
  
  breaker.on('open', () => {
    console.error(`⚠️  Circuit ${options.name}: OPEN - Too many failures`);
  });
  
  breaker.on('halfOpen', () => {
    console.log(`🔄 Circuit ${options.name}: HALF-OPEN - Testing...`);
  });
  
  breaker.on('close', () => {
    console.log(`✅ Circuit ${options.name}: CLOSED - Service recovered`);
  });
  
  breaker.on('fallback', (result) => {
    console.log(`🔀 Circuit ${options.name}: Fallback executed`);
  });
  
  // Add fallback if provided
  if (options.fallback) {
    breaker.fallback(options.fallback);
  }
  
  return breaker;
}

/**
 * GitHub API circuit breaker
 */
const githubBreaker = createCircuitBreaker(
  async (url, options) => {
    const axios = require('axios');
    return await axios.get(url, options);
  },
  {
    name: 'github',
    timeout: 5000,
    fallback: () => ({
      data: null,
      status: 503,
      message: 'GitHub API unavailable'
    })
  }
);

/**
 * Anthropic API circuit breaker
 */
const anthropicBreaker = createCircuitBreaker(
  async (data, options) => {
    const axios = require('axios');
    return await axios.post('https://api.anthropic.com/v1/messages', data, options);
  },
  {
    name: 'anthropic',
    timeout: 30000, // AI calls can take longer
    errorThreshold: 60,
    fallback: () => ({
      data: null,
      status: 503,
      message: 'Anthropic API unavailable'
    })
  }
);

/**
 * OpenAI API circuit breaker
 */
const openaiBreaker = createCircuitBreaker(
  async (data, options) => {
    const axios = require('axios');
    return await axios.post('https://api.openai.com/v1/chat/completions', data, options);
  },
  {
    name: 'openai',
    timeout: 30000,
    errorThreshold: 60,
    fallback: () => ({
      data: null,
      status: 503,
      message: 'OpenAI API unavailable'
    })
  }
);

/**
 * Redis circuit breaker
 */
const redisBreaker = createCircuitBreaker(
  async (operation) => {
    return await operation();
  },
  {
    name: 'redis',
    timeout: 1000,
    fallback: () => ({
      success: false,
      message: 'Redis unavailable'
    })
  }
);

/**
 * Database circuit breaker
 */
const databaseBreaker = createCircuitBreaker(
  async (query, params) => {
    const { pool } = require('../config/database');
    return await pool.query(query, params);
  },
  {
    name: 'database',
    timeout: 5000,
    errorThreshold: 75,
    fallback: () => {
      throw new Error('Database service unavailable');
    }
  }
);

/**
 * Get all circuit breaker stats
 */
function getCircuitBreakerStats() {
  return {
    github: githubBreaker.stats,
    anthropic: anthropicBreaker.stats,
    openai: openaiBreaker.stats,
    redis: redisBreaker.stats,
    database: databaseBreaker.stats
  };
}

module.exports = {
  createCircuitBreaker,
  githubBreaker,
  anthropicBreaker,
  openaiBreaker,
  redisBreaker,
  databaseBreaker,
  getCircuitBreakerStats
};
