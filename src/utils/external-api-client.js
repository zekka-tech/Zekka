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
const { validateExternalUrl } = require('./ssrf-guard');

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
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
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
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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

  async callAnthropicStream(payload, options = {}) {
    return await this.breakers.anthropic.execute(async () => {
      const startTime = Date.now();
      let content = '';
      let finalUsage = null;

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
          data: {
            ...payload,
            stream: true
          },
          timeout: 60000,
          responseType: 'stream',
          ...options
        });

        for await (const event of this._iterateSseStream(response.data)) {
          if (event.type === 'content_block_delta' && event.delta?.text) {
            content += event.delta.text;
            if (typeof options.onToken === 'function') {
              await options.onToken(event.delta.text, event);
            }
          }

          if (event.type === 'message_delta' && event.usage) {
            finalUsage = event.usage;
          }
        }

        this.requestCount.anthropic++;
        const duration = Date.now() - startTime;
        await this._logAPICall('anthropic', 'messages_stream', 'success', {
          duration,
          model: payload.model,
          tokens: finalUsage
        });

        return {
          text: content,
          usage: finalUsage || {}
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        await this._logAPICall('anthropic', 'messages_stream', 'error', {
          duration,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Call OpenAI API with native streaming
   * @param {Object} payload - Request payload
   * @param {Object} options - Request options
   * @param {Function} options.onToken - Token callback invoked with streamed text deltas
   * @returns {Promise<any>} Aggregated API response
   */
  async callOpenAIStream(payload, options = {}) {
    let aggregatedResponse = '';
    let finalChunk = null;
    let usage = null;

    for await (const event of this._iterateOpenAIStream(payload, options)) {
      if (event.type === 'delta') {
        aggregatedResponse += event.text;

        if (typeof options.onToken === 'function') {
          await options.onToken(event.text, event.raw);
        }
      }

      if (event.type === 'complete') {
        finalChunk = event.data;
        usage = event.data?.usage || usage;
      }
    }

    return {
      response: aggregatedResponse,
      model: payload.model,
      usage: usage || {
        prompt_tokens: 0,
        completion_tokens: Math.ceil(aggregatedResponse.length / 4),
        total_tokens: Math.ceil(aggregatedResponse.length / 4)
      },
      raw: finalChunk
    };
  }

  /**
   * Call Ollama API
   * @param {Object} payload - Request payload
   * @param {Object} options - Request options
   * @returns {Promise<any>} API response
   */
  async callOllama(payload, options = {}) {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    validateExternalUrl(ollamaHost, 'OLLAMA_HOST');

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
   * Call Ollama API with native streaming
   * @param {Object} payload - Request payload
   * @param {Object} options - Request options
   * @param {Function} options.onToken - Token callback invoked with each streamed text chunk
   * @returns {Promise<any>} Aggregated API response
   */
  async callOllamaStream(payload, options = {}) {
    let aggregatedResponse = '';
    let finalChunk = null;

    for await (const event of this._iterateOllamaStream(payload, options)) {
      if (event.type === 'delta') {
        aggregatedResponse += event.text;

        if (typeof options.onToken === 'function') {
          await options.onToken(event.text, event.raw);
        }
      }

      if (event.type === 'complete') {
        finalChunk = event.data;
      }
    }

    return {
      response: aggregatedResponse,
      model: payload.model,
      prompt_eval_count: finalChunk?.prompt_eval_count || 0,
      eval_count: finalChunk?.eval_count || Math.ceil(aggregatedResponse.length / 4),
      done: true,
      raw: finalChunk
    };
  }

  /**
   * Stream Ollama API responses as incremental deltas.
   * @param {Object} payload - Request payload
   * @param {Object} options - Request options
   * @yields {{type: 'delta', text: string} | {type: 'complete', data: Object}}
   */
  async *streamOllama(payload, options = {}) {
    yield * this._iterateOllamaStream(payload, options);
  }

  async *_iterateOllamaStream(payload, options = {}) {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    validateExternalUrl(ollamaHost, 'OLLAMA_HOST');
    const startTime = Date.now();
    let streamedResponse;

    try {
      streamedResponse = await this.breakers.ollama.execute(async () => axios({
        url: `${ollamaHost}/api/generate`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        data: {
          ...payload,
          stream: true
        },
        timeout: 120000,
        responseType: 'stream',
        ...options
      }));

      this.requestCount.ollama++;
      let buffer = '';

      for await (const chunk of streamedResponse.data) {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          const event = JSON.parse(line);

          if (event.response) {
            yield {
              type: 'delta',
              text: event.response,
              raw: event
            };
          }

          if (event.done) {
            await this._logAPICall('ollama', 'generate_stream', 'success', {
              duration: Date.now() - startTime,
              model: payload.model
            });
            yield {
              type: 'complete',
              data: event
            };
          }
        }
      }

      if (buffer.trim()) {
        const event = JSON.parse(buffer);
        if (event.response) {
          yield {
            type: 'delta',
            text: event.response,
            raw: event
          };
        }
        if (event.done) {
          await this._logAPICall('ollama', 'generate_stream', 'success', {
            duration: Date.now() - startTime,
            model: payload.model
          });
          yield {
            type: 'complete',
            data: event
          };
        }
      }
    } catch (error) {
      await this._logAPICall('ollama', 'generate_stream', 'error', {
        duration: Date.now() - startTime,
        error: error.message
      });
      throw error;
    }
  }

  async *_iterateSseStream(stream) {
    let buffer = '';
    let eventName = null;

    const flushEvent = async (lines) => {
      if (lines.length === 0) {
        return null;
      }

      const data = lines.join('\n').trim();
      if (!data || data === '[DONE]') {
        return null;
      }

      const parsed = JSON.parse(data);
      if (eventName) {
        parsed.type = parsed.type || eventName;
      }
      return parsed;
    };

    let dataLines = [];

    for await (const chunk of stream) {
      buffer += chunk.toString('utf8');

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
        buffer = buffer.slice(newlineIndex + 1);

        if (!line) {
          const parsed = await flushEvent(dataLines);
          if (parsed) {
            yield parsed;
          }
          dataLines = [];
          eventName = null;
        } else if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }

        newlineIndex = buffer.indexOf('\n');
      }
    }

    if (buffer.trim()) {
      if (buffer.startsWith('data:')) {
        dataLines.push(buffer.slice(5).trim());
      } else {
        dataLines.push(buffer.trim());
      }
    }

    const parsed = await flushEvent(dataLines);
    if (parsed) {
      yield parsed;
    }
  }

  async *_iterateOpenAIStream(payload, options = {}) {
    const startTime = Date.now();
    let responseStream;
    let lastEvent = null;

    try {
      responseStream = await this.breakers.openai.execute(async () => axios({
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...options.headers
        },
        data: {
          ...payload,
          stream: true,
          stream_options: {
            include_usage: true,
            ...(payload.stream_options || {})
          }
        },
        timeout: 60000,
        responseType: 'stream',
        ...options
      }));

      this.requestCount.openai++;
      let buffer = '';

      for await (const chunk of responseStream.data) {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) {
            continue;
          }

          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            await this._logAPICall('openai', 'chat/completions_stream', 'success', {
              duration: Date.now() - startTime,
              model: payload.model
            });

            yield {
              type: 'complete',
              data: lastEvent
            };
            return;
          }

          const event = JSON.parse(data);
          lastEvent = event;
          const text = event.choices?.[0]?.delta?.content || '';

          if (text) {
            yield {
              type: 'delta',
              text,
              raw: event
            };
          }
        }
      }

      await this._logAPICall('openai', 'chat/completions_stream', 'success', {
        duration: Date.now() - startTime,
        model: payload.model
      });

      yield {
        type: 'complete',
        data: lastEvent
      };
    } catch (error) {
      await this._logAPICall('openai', 'chat/completions_stream', 'error', {
        duration: Date.now() - startTime,
        error: error.message
      });
      throw error;
    }
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
      console.warn(
        'Primary service failed, attempting fallback:',
        error.message
      );

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
            prompt
          });
          return response.response;
        }
      );
    }
    if (preferredModel === 'openai' && process.env.OPENAI_API_KEY) {
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
            prompt
          });
          return response.response;
        }
      );
    }
    // Default to Ollama
    const response = await this.callOllama({
      model: options.model || 'llama2',
      prompt
    });
    return response.response;
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
          headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
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
    validateExternalUrl(ollamaHost, 'OLLAMA_HOST');
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
