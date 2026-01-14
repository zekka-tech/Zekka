/**
 * External API Client
 * Unified client for all external API integrations with circuit breakers,
 * caching, fallback strategies, and health monitoring
 * 
 * Features:
 * - Circuit breaker protection for each service
 * - Response caching for GET requests
 * - Timeout configuration
 * - Fallback strategies
 * - Health monitoring
 * - Rate limiting awareness
 * - Comprehensive error handling
 */

const axios = require('axios');
const { CircuitBreaker } = require('./circuit-breaker');
const { CacheManager } = require('./cache-manager');
const { AuditLogger } = require('./audit-logger');

class ExternalAPIClient {
  constructor(config = {}) {
    this.config = {
      timeout: config.timeout || 10000, // 10 seconds default
      cacheTTL: config.cacheTTL || 300, // 5 minutes
      enableCache: config.enableCache !== false,
      enableLogging: config.enableLogging !== false
    };

    // Initialize cache manager
    if (this.config.enableCache) {
      this.cache = new CacheManager();
    }

    // Initialize audit logger
    if (this.config.enableLogging) {
      this.auditLogger = new AuditLogger();
    }

    // Create circuit breakers for each external service
    this.breakers = {
      github: new CircuitBreaker({
        name: 'github-api',
        failureThreshold: 5,
        resetTimeout: 60000,
        monitor: true
      }),
      anthropic: new CircuitBreaker({
        name: 'anthropic-api',
        failureThreshold: 3,
        resetTimeout: 30000,
        monitor: true
      }),
      openai: new CircuitBreaker({
        name: 'openai-api',
        failureThreshold: 3,
        resetTimeout: 30000,
        monitor: true
      }),
      ollama: new CircuitBreaker({
        name: 'ollama-api',
        failureThreshold: 5,
        resetTimeout: 60000,
        monitor: true
      })
    };

    this.requestCount = {
      github: 0,
      anthropic: 0,
      openai: 0,
      ollama: 0
    };
  }

  /**
   * Call GitHub API
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<any>} API response
   */
  async callGitHub(endpoint, options = {}) {
    const cacheKey = `github:${endpoint}:${JSON.stringify(options)}`;
    
    // Try cache first for GET requests
    if (options.method === 'GET' || !options.method) {
      const cached = await this._getCached(cacheKey);
      if (cached) {
        await this._logAPICall('github', endpoint, 'cache_hit');
        return cached;
      }
    }

    // Call with circuit breaker
    const result = await this.breakers.github.execute(async () => {
      const startTime = Date.now();
      
      try {
        const response = await axios({
          url: `https://api.github.com${endpoint}`,
          method: options.method || 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            ...options.headers
          },
          timeout: this.config.timeout,
          ...options
        });

        this.requestCount.github++;
        const duration = Date.now() - startTime;

        // Cache successful GET responses
        if (!options.method || options.method === 'GET') {
          await this._setCached(cacheKey, response.data);
        }

        await this._logAPICall('github', endpoint, 'success', { duration });
        
        return response.data;

      } catch (error) {
        const duration = Date.now() - startTime;
        await this._logAPICall('github', endpoint, 'error', { 
          duration, 
          error: error.message 
        });
        throw error;
      }
    });

    return result;
  }

  /**
   * Call Anthropic Claude API
   * @param {Object} payload - Request payload
   * @param {Object} options - Request options
   * @returns {Promise<any>} API response
   */
  async callAnthropic(payload, options = {}) {
    return await this.breakers.anthropic.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.anthropic.com/v1/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            ...options.headers
          },
          data: payload,
          timeout: 60000, // 60 seconds for LLM calls
          ...options
        });

        this.requestCount.anthropic++;
        const duration = Date.now() - startTime;

        await this._logAPICall('anthropic', 'messages', 'success', { 
          duration,
          model: payload.model,
          tokens: response.data.usage
        });

        return response.data;

      } catch (error) {
        const duration = Date.now() - startTime;
        await this._logAPICall('anthropic', 'messages', 'error', { 
          duration, 
          error: error.message 
        });
        throw error;
      }
    });
  }

  /**
   * Call OpenAI API
   * @param {Object} payload - Request payload
   * @param {Object} options - Request options
   * @returns {Promise<any>} API response
   */
  async callOpenAI(payload, options = {}) {
    return await this.breakers.openai.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            ...options.headers
          },
          data: payload,
          timeout: 60000, // 60 seconds for LLM calls
          ...options
        });

        this.requestCount.openai++;
        const duration = Date.now() - startTime;

        await this._logAPICall('openai', 'chat/completions', 'success', { 
          duration,
          model: payload.model,
          tokens: response.data.usage
        });

        return response.data;

      } catch (error) {
        const duration = Date.now() - startTime;
        await this._logAPICall('openai', 'chat/completions', 'error', { 
          duration, 
          error: error.message 
        });
        throw error;
      }
    });
  }

  /**
   * Call Ollama API
   * @param {Object} payload - Request payload
   * @param {Object} options - Request options
   * @returns {Promise<any>} API response
   */
  async callOllama(payload, options = {}) {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    
    return await this.breakers.ollama.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: `${ollamaHost}/api/generate`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          data: payload,
          timeout: 120000, // 2 minutes for local LLM
          ...options
        });

        this.requestCount.ollama++;
        const duration = Date.now() - startTime;

        await this._logAPICall('ollama', 'generate', 'success', { 
          duration,
          model: payload.model
        });

        return response.data;

      } catch (error) {
        const duration = Date.now() - startTime;
        await this._logAPICall('ollama', 'generate', 'error', { 
          duration, 
          error: error.message 
        });
        throw error;
      }
    });
  }

  /**
   * Call with primary and fallback strategies
   * @param {Function} primaryFn - Primary function to execute
   * @param {Function} fallbackFn - Fallback function if primary fails
   * @param {Object} options - Options
   * @returns {Promise<any>} Result from primary or fallback
   */
  async callWithFallback(primaryFn, fallbackFn, options = {}) {
    try {
      return await primaryFn();
    } catch (error) {
      console.warn(`Primary service failed, attempting fallback:`, error.message);
      
      if (this.config.enableLogging && this.auditLogger) {
        await this.auditLogger.log({
          category: 'external_api',
          action: 'fallback_triggered',
          details: {
            primaryError: error.message,
            fallbackAvailable: !!fallbackFn
          },
          severity: 'warning'
        });
      }

      if (fallbackFn) {
        try {
          return await fallbackFn();
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError.message);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Generate AI response with automatic fallback
   * @param {string} prompt - User prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated response
   */
  async generateWithAI(prompt, options = {}) {
    const { preferredModel = 'anthropic', maxTokens = 1000 } = options;

    // Try preferred model first
    if (preferredModel === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      return await this.callWithFallback(
        // Primary: Anthropic Claude
        async () => {
          const response = await this.callAnthropic({
            model: 'claude-3-5-sonnet-20241022',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens
          });
          return response.content[0].text;
        },
        // Fallback: Local Ollama
        async () => {
          const response = await this.callOllama({
            model: 'llama2',
            prompt: prompt
          });
          return response.response;
        }
      );
    } else if (preferredModel === 'openai' && process.env.OPENAI_API_KEY) {
      return await this.callWithFallback(
        // Primary: OpenAI
        async () => {
          const response = await this.callOpenAI({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens
          });
          return response.choices[0].message.content;
        },
        // Fallback: Local Ollama
        async () => {
          const response = await this.callOllama({
            model: 'llama2',
            prompt: prompt
          });
          return response.response;
        }
      );
    } else {
      // Default to Ollama
      const response = await this.callOllama({
        model: options.model || 'llama2',
        prompt: prompt
      });
      return response.response;
    }
  }

  /**
   * Health check for all external services
   * @returns {Promise<Object>} Health status of all services
   */
  async healthCheck() {
    const checks = {};

    // GitHub
    try {
      if (process.env.GITHUB_TOKEN) {
        const response = await axios.get('https://api.github.com/rate_limit', {
          headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` },
          timeout: 5000
        });
        checks.github = {
          status: 'healthy',
          rateLimit: response.data.rate,
          circuitBreaker: {
            state: this.breakers.github.state,
            stats: this.breakers.github.getStats()
          }
        };
      } else {
        checks.github = { status: 'not_configured' };
      }
    } catch (error) {
      checks.github = { 
        status: 'unhealthy', 
        error: error.message,
        circuitBreaker: {
          state: this.breakers.github.state
        }
      };
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      checks.anthropic = { 
        status: 'configured',
        circuitBreaker: {
          state: this.breakers.anthropic.state,
          stats: this.breakers.anthropic.getStats()
        }
      };
    } else {
      checks.anthropic = { status: 'not_configured' };
    }

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      checks.openai = { 
        status: 'configured',
        circuitBreaker: {
          state: this.breakers.openai.state,
          stats: this.breakers.openai.getStats()
        }
      };
    } else {
      checks.openai = { status: 'not_configured' };
    }

    // Ollama
    try {
      const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
      await axios.get(`${ollamaHost}/api/tags`, { timeout: 5000 });
      checks.ollama = { 
        status: 'healthy',
        circuitBreaker: {
          state: this.breakers.ollama.state,
          stats: this.breakers.ollama.getStats()
        }
      };
    } catch (error) {
      checks.ollama = { 
        status: 'unhealthy', 
        error: error.message,
        circuitBreaker: {
          state: this.breakers.ollama.state
        }
      };
    }

    return checks;
  }

  /**
   * Get usage statistics for all services
   * @returns {Object} Usage statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      circuitBreakers: {
        github: this.breakers.github.getStats(),
        anthropic: this.breakers.anthropic.getStats(),
        openai: this.breakers.openai.getStats(),
        ollama: this.breakers.ollama.getStats()
      },
      cacheStats: this.cache ? this.cache.getStats() : null
    };
  }

  /**
   * Get cached value
   * @private
   */
  async _getCached(key) {
    if (!this.config.enableCache || !this.cache) {
      return null;
    }
    return await this.cache.get(key);
  }

  /**
   * Set cached value
   * @private
   */
  async _setCached(key, value) {
    if (!this.config.enableCache || !this.cache) {
      return;
    }
    await this.cache.set(key, value, this.config.cacheTTL);
  }

  /**
   * Log API call
   * @private
   */
  async _logAPICall(service, endpoint, status, details = {}) {
    if (!this.config.enableLogging || !this.auditLogger) {
      return;
    }

    await this.auditLogger.log({
      category: 'external_api',
      action: `${service}_${status}`,
      details: {
        service,
        endpoint,
        status,
        ...details
      },
      severity: status === 'error' ? 'error' : 'info'
    });
  }

  /**
   * Close all connections
   */
  async close() {
    if (this.cache) {
      await this.cache.close();
    }
  }
}

module.exports = { ExternalAPIClient };
