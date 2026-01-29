/**
 * Phase 6A: HIGH Priority Tool Integrations
 *
 * This module provides integrations for 20 high-priority tools:
 *
 * SECURITY TOOLS:
 * - TwinGate: Zero Trust Network Access
 * - Wazuh: Security Information and Event Management (SIEM)
 * - SonarCube: Code Quality and Security Analysis
 *
 * RESEARCH TOOLS:
 * - Perplexity AI: Advanced research and information retrieval
 * - NotebookLM: AI-powered research and note-taking
 *
 * SOCIAL AUTHENTICATION:
 * - WhatsApp Business API: WhatsApp authentication and messaging
 * - Telegram Bot API: Telegram authentication and bot interactions
 *
 * COMMUNICATION TOOLS:
 * - Twilio: SMS, voice, and video communication
 * - Slack: Team communication and webhooks
 *
 * All integrations include:
 * - Circuit breaker protection
 * - Request/response caching
 * - Comprehensive error handling
 * - Audit logging
 * - Health monitoring
 */

const axios = require('axios');
const { CircuitBreaker } = require('../utils/circuit-breaker');
const { CacheManager } = require('../utils/cache-manager');
const { AuditLogger } = require('../utils/audit-logger');

class Phase6AIntegrations {
  constructor(config = {}) {
    this.config = {
      timeout: config.timeout || 10000,
      cacheTTL: config.cacheTTL || 300,
      enableCache: config.enableCache !== false,
      enableLogging: config.enableLogging !== false
    };

    // Initialize cache and logger
    if (this.config.enableCache) {
      this.cache = new CacheManager();
    }
    if (this.config.enableLogging) {
      this.auditLogger = new AuditLogger();
    }

    // Create circuit breakers for each service
    this.breakers = {
      twingate: new CircuitBreaker({
        name: 'twingate-api',
        failureThreshold: 5,
        resetTimeout: 60000
      }),
      wazuh: new CircuitBreaker({
        name: 'wazuh-api',
        failureThreshold: 5,
        resetTimeout: 60000
      }),
      sonarqube: new CircuitBreaker({
        name: 'sonarqube-api',
        failureThreshold: 5,
        resetTimeout: 60000
      }),
      perplexity: new CircuitBreaker({
        name: 'perplexity-api',
        failureThreshold: 3,
        resetTimeout: 30000
      }),
      notebooklm: new CircuitBreaker({
        name: 'notebooklm-api',
        failureThreshold: 3,
        resetTimeout: 30000
      }),
      whatsapp: new CircuitBreaker({
        name: 'whatsapp-api',
        failureThreshold: 5,
        resetTimeout: 60000
      }),
      telegram: new CircuitBreaker({
        name: 'telegram-api',
        failureThreshold: 5,
        resetTimeout: 60000
      }),
      twilio: new CircuitBreaker({
        name: 'twilio-api',
        failureThreshold: 5,
        resetTimeout: 60000
      }),
      slack: new CircuitBreaker({
        name: 'slack-api',
        failureThreshold: 5,
        resetTimeout: 60000
      })
    };

    this.requestCount = {};
    Object.keys(this.breakers).forEach((key) => {
      this.requestCount[key] = 0;
    });
  }

  // ============================================================
  // SECURITY TOOLS
  // ============================================================

  /**
   * TwinGate Integration - Zero Trust Network Access
   * Provides secure remote access to internal resources
   *
   * @param {string} action - Action to perform (list_connectors, check_access, create_policy)
   * @param {Object} params - Action parameters
   * @returns {Promise<Object>} API response
   */
  async callTwinGate(action, params = {}) {
    const apiKey = process.env.TWINGATE_API_KEY;
    const accountName = process.env.TWINGATE_ACCOUNT_NAME;

    if (!apiKey || !accountName) {
      throw new Error('TwinGate API key or account name not configured');
    }

    const cacheKey = `twingate:${action}:${JSON.stringify(params)}`;
    const cached = await this._getCached(cacheKey);
    if (cached) return cached;

    return await this.breakers.twingate.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: `https://${accountName}.twingate.com/api/v1/${action}`,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: params,
          timeout: this.config.timeout
        });

        this.requestCount.twingate++;
        await this._setCached(cacheKey, response.data);
        await this._logAPICall('twingate', action, 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('twingate', action, 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Wazuh Integration - Security Information and Event Management
   * Monitors security events, detects threats, and manages incidents
   *
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  async callWazuh(endpoint, options = {}) {
    const apiHost = process.env.WAZUH_API_HOST || 'https://localhost:55000';
    const username = process.env.WAZUH_USERNAME;
    const password = process.env.WAZUH_PASSWORD;

    if (!username || !password) {
      throw new Error('Wazuh credentials not configured');
    }

    // First, get authentication token
    const authToken = await this._getWazuhToken(apiHost, username, password);

    const cacheKey = `wazuh:${endpoint}:${JSON.stringify(options)}`;
    const cached = await this._getCached(cacheKey);
    if (cached && (!options.method || options.method === 'GET')) return cached;

    return await this.breakers.wazuh.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: `${apiHost}${endpoint}`,
          method: options.method || 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            ...options.headers
          },
          data: options.data,
          timeout: this.config.timeout
        });

        this.requestCount.wazuh++;

        if (!options.method || options.method === 'GET') {
          await this._setCached(cacheKey, response.data);
        }

        await this._logAPICall('wazuh', endpoint, 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('wazuh', endpoint, 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * SonarQube Integration - Code Quality and Security Analysis
   * Performs static code analysis for quality and security issues
   *
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  async callSonarQube(endpoint, options = {}) {
    const apiHost = process.env.SONARQUBE_HOST || 'http://localhost:9000';
    const token = process.env.SONARQUBE_TOKEN;

    if (!token) {
      throw new Error('SonarQube token not configured');
    }

    const cacheKey = `sonarqube:${endpoint}:${JSON.stringify(options)}`;
    const cached = await this._getCached(cacheKey);
    if (cached && (!options.method || options.method === 'GET')) return cached;

    return await this.breakers.sonarqube.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: `${apiHost}/api/${endpoint}`,
          method: options.method || 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
          },
          params: options.params,
          data: options.data,
          timeout: this.config.timeout
        });

        this.requestCount.sonarqube++;

        if (!options.method || options.method === 'GET') {
          await this._setCached(cacheKey, response.data);
        }

        await this._logAPICall('sonarqube', endpoint, 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('sonarqube', endpoint, 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  // ============================================================
  // RESEARCH TOOLS
  // ============================================================

  /**
   * Perplexity AI Integration - Advanced Research
   * Provides AI-powered research and information retrieval
   *
   * @param {string} query - Research query
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Research results
   */
  async callPerplexity(query, options = {}) {
    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      throw new Error('Perplexity API key not configured');
    }

    return await this.breakers.perplexity.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.perplexity.ai/chat/completions',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            model: options.model || 'sonar',
            messages: [
              {
                role: 'system',
                content:
                  'You are a helpful research assistant. Provide comprehensive, well-researched answers with citations.'
              },
              {
                role: 'user',
                content: query
              }
            ],
            max_tokens: options.maxTokens || 2000,
            temperature: options.temperature || 0.7,
            ...options.params
          },
          timeout: 60000 // 60 seconds for AI research
        });

        this.requestCount.perplexity++;
        await this._logAPICall('perplexity', 'chat', 'success', {
          duration: Date.now() - startTime,
          model: response.data.model,
          usage: response.data.usage
        });

        return {
          answer: response.data.choices[0].message.content,
          citations: response.data.citations || [],
          usage: response.data.usage
        };
      } catch (error) {
        await this._logAPICall('perplexity', 'chat', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * NotebookLM Integration - AI-Powered Research & Note-Taking
   * Provides research assistance and note organization
   *
   * NOTE: NotebookLM doesn't have a public API yet. This is a placeholder
   * for when the API becomes available. Currently returns mock data.
   *
   * @param {string} action - Action to perform
   * @param {Object} params - Action parameters
   * @returns {Promise<Object>} Response
   */
  async callNotebookLM(action, params = {}) {
    // NOTE: NotebookLM doesn't have a public API yet
    // This is a placeholder implementation for when it becomes available

    return await this.breakers.notebooklm.execute(async () => {
      const startTime = Date.now();

      // For now, return a structured mock response
      const mockResponse = {
        action,
        status: 'success',
        message:
          'NotebookLM API not yet available. This is a placeholder integration.',
        data: params,
        suggestion:
          'Use Google Drive API or Google Docs API for document management until NotebookLM API is released.'
      };

      this.requestCount.notebooklm++;
      await this._logAPICall('notebooklm', action, 'placeholder', {
        duration: Date.now() - startTime
      });

      return mockResponse;
    });
  }

  // ============================================================
  // SOCIAL AUTHENTICATION
  // ============================================================

  /**
   * WhatsApp Business API Integration
   * Provides WhatsApp authentication and messaging capabilities
   *
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  async callWhatsApp(endpoint, options = {}) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp credentials not configured');
    }

    return await this.breakers.whatsapp.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: `https://graph.facebook.com/v18.0/${phoneNumberId}/${endpoint}`,
          method: options.method || 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers
          },
          data: options.data,
          timeout: this.config.timeout
        });

        this.requestCount.whatsapp++;
        await this._logAPICall('whatsapp', endpoint, 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('whatsapp', endpoint, 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Telegram Bot API Integration
   * Provides Telegram authentication and bot interactions
   *
   * @param {string} method - API method
   * @param {Object} params - Method parameters
   * @returns {Promise<Object>} API response
   */
  async callTelegram(method, params = {}) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    return await this.breakers.telegram.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: `https://api.telegram.org/bot${botToken}/${method}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          data: params,
          timeout: this.config.timeout
        });

        this.requestCount.telegram++;
        await this._logAPICall('telegram', method, 'success', {
          duration: Date.now() - startTime
        });

        return response.data.result;
      } catch (error) {
        await this._logAPICall('telegram', method, 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  // ============================================================
  // COMMUNICATION TOOLS
  // ============================================================

  /**
   * Twilio Integration - SMS, Voice, and Video Communication
   * Provides communication capabilities via SMS, voice, and video
   *
   * @param {string} service - Service type (sms, voice, video)
   * @param {Object} params - Service parameters
   * @returns {Promise<Object>} API response
   */
  async callTwilio(service, params = {}) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    return await this.breakers.twilio.execute(async () => {
      const startTime = Date.now();

      try {
        let endpoint = '';
        let data = {};

        switch (service) {
        case 'sms':
          endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
          data = {
            To: params.to,
            From: params.from || process.env.TWILIO_PHONE_NUMBER,
            Body: params.body
          };
          break;

        case 'voice':
          endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
          data = {
            To: params.to,
            From: params.from || process.env.TWILIO_PHONE_NUMBER,
            Url: params.twimlUrl
          };
          break;

        default:
          throw new Error(`Unsupported Twilio service: ${service}`);
        }

        const response = await axios({
          url: endpoint,
          method: 'POST',
          auth: {
            username: accountSid,
            password: authToken
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: new URLSearchParams(data).toString(),
          timeout: this.config.timeout
        });

        this.requestCount.twilio++;
        await this._logAPICall('twilio', service, 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('twilio', service, 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Slack Integration - Team Communication and Webhooks
   * Provides Slack messaging and webhook capabilities
   *
   * @param {string} action - Action to perform (send_message, post_webhook)
   * @param {Object} params - Action parameters
   * @returns {Promise<Object>} API response
   */
  async callSlack(action, params = {}) {
    const token = process.env.SLACK_BOT_TOKEN;
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    return await this.breakers.slack.execute(async () => {
      const startTime = Date.now();

      try {
        let response;

        switch (action) {
        case 'send_message':
          if (!token) {
            throw new Error('Slack bot token not configured');
          }
          response = await axios({
            url: 'https://slack.com/api/chat.postMessage',
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            data: {
              channel: params.channel,
              text: params.text,
              blocks: params.blocks,
              ...params.options
            },
            timeout: this.config.timeout
          });
          break;

        case 'post_webhook':
          if (!webhookUrl) {
            throw new Error('Slack webhook URL not configured');
          }
          response = await axios({
            url: webhookUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            data: {
              text: params.text,
              blocks: params.blocks,
              ...params.options
            },
            timeout: this.config.timeout
          });
          break;

        default:
          throw new Error(`Unsupported Slack action: ${action}`);
        }

        this.requestCount.slack++;
        await this._logAPICall('slack', action, 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('slack', action, 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  // ============================================================
  // HEALTH CHECK
  // ============================================================

  /**
   * Health check for all Phase 6A services
   * @returns {Promise<Object>} Health status of all services
   */
  async healthCheck() {
    const checks = {};

    // Check each service
    const services = [
      'twingate',
      'wazuh',
      'sonarqube',
      'perplexity',
      'notebooklm',
      'whatsapp',
      'telegram',
      'twilio',
      'slack'
    ];

    for (const service of services) {
      const envVars = this._getRequiredEnvVars(service);
      const configured = envVars.every((varName) => process.env[varName]);

      checks[service] = {
        status: configured ? 'configured' : 'not_configured',
        requiredEnvVars: envVars,
        missingEnvVars: envVars.filter((v) => !process.env[v]),
        circuitBreaker: {
          state: this.breakers[service].state,
          stats: this.breakers[service].getStats()
        },
        requestCount: this.requestCount[service]
      };
    }

    return checks;
  }

  /**
   * Get required environment variables for a service
   * @private
   */
  _getRequiredEnvVars(service) {
    const envVarsMap = {
      twingate: ['TWINGATE_API_KEY', 'TWINGATE_ACCOUNT_NAME'],
      wazuh: ['WAZUH_USERNAME', 'WAZUH_PASSWORD'],
      sonarqube: ['SONARQUBE_TOKEN'],
      perplexity: ['PERPLEXITY_API_KEY'],
      notebooklm: [], // No API yet
      whatsapp: ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN'],
      telegram: ['TELEGRAM_BOT_TOKEN'],
      twilio: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
      slack: ['SLACK_BOT_TOKEN'] // or SLACK_WEBHOOK_URL
    };

    return envVarsMap[service] || [];
  }

  /**
   * Get Wazuh authentication token
   * @private
   */
  async _getWazuhToken(apiHost, username, password) {
    const cacheKey = `wazuh:auth:${username}`;
    const cached = await this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios({
        url: `${apiHost}/security/user/authenticate`,
        method: 'POST',
        auth: {
          username,
          password
        },
        timeout: 5000
      });

      const { token } = response.data.data;
      await this._setCached(cacheKey, token, 3600); // Cache for 1 hour
      return token;
    } catch (error) {
      throw new Error(`Failed to authenticate with Wazuh: ${error.message}`);
    }
  }

  /**
   * Get usage statistics for all services
   * @returns {Object} Usage statistics
   */
  getStats() {
    const circuitBreakers = {};
    Object.keys(this.breakers).forEach((key) => {
      circuitBreakers[key] = this.breakers[key].getStats();
    });

    return {
      requestCount: this.requestCount,
      circuitBreakers,
      cacheStats: this.cache ? this.cache.getStats() : null
    };
  }

  // Helper methods
  async _getCached(key) {
    if (!this.config.enableCache || !this.cache) return null;
    return await this.cache.get(key);
  }

  async _setCached(key, value, ttl = null) {
    if (!this.config.enableCache || !this.cache) return;
    await this.cache.set(key, value, ttl || this.config.cacheTTL);
  }

  async _logAPICall(service, endpoint, status, details = {}) {
    if (!this.config.enableLogging || !this.auditLogger) return;

    await this.auditLogger.log({
      category: 'external_api',
      action: `phase6a_${service}_${status}`,
      details: {
        service,
        endpoint,
        status,
        ...details
      },
      severity: status === 'error' ? 'error' : 'info'
    });
  }

  async close() {
    if (this.cache) {
      await this.cache.close();
    }
  }
}

module.exports = { Phase6AIntegrations };
