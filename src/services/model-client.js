/**
 * Unified Model Client Service
 *
 * Centralized service for all AI model interactions with intelligent fallback strategies.
 * This service provides a unified interface for interacting with multiple LLM providers
 * (Claude, Gemini, OpenAI, Ollama) with automatic fallback capabilities.
 *
 * Architecture:
 * - Each component (Arbitrator, Orchestrator) has a designated primary model
 * - Fallback chain: Primary Model → Ollama (local)
 * - Automatic retry with exponential backoff
 * - Circuit breaker pattern for fault tolerance
 * - Comprehensive error handling and logging
 *
 * Model Assignments:
 * - Arbitrator: Claude Sonnet 4.5 (conflict resolution requires advanced reasoning)
 * - Orchestrator: Gemini Pro (cost-effective for workflow coordination)
 * - Fallback: Ollama (always available, no API costs, runs locally)
 *
 * @module services/model-client
 * @requires axios - HTTP client for API calls
 * @requires ../utils/external-api-client - Existing API client infrastructure
 */

const axios = require('axios');
const { ExternalAPIClient } = require('../utils/external-api-client');

/**
 * Model Client - Unified interface for all LLM interactions
 */
class ModelClient {
  /**
   * Initialize the Model Client
   *
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger instance (default: console)
   * @param {Object} options.tokenEconomics - Token economics instance for cost tracking
   * @param {Object} options.contextBus - Context bus for state management
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.tokenEconomics = options.tokenEconomics;
    this.contextBus = options.contextBus;

    // Initialize the external API client (handles circuit breakers, caching)
    this.apiClient = new ExternalAPIClient({
      timeout: 60000, // 60 seconds for LLM calls
      enableCache: false, // Don't cache LLM responses (each is unique)
      enableLogging: true
    });

    // Model configuration with defaults
    // These can be overridden by environment variables
    this.modelConfig = {
      arbitrator: {
        primary: process.env.ARBITRATOR_MODEL || 'claude-sonnet-4-5',
        fallback: process.env.FALLBACK_MODEL || 'ollama',
        maxTokens: 4000,
        temperature: 0.3 // Lower temperature for more deterministic conflict resolution
      },
      orchestrator: {
        primary: process.env.ORCHESTRATOR_MODEL || 'gemini-pro',
        fallback: process.env.FALLBACK_MODEL || 'ollama',
        maxTokens: 2000,
        temperature: 0.7 // Moderate temperature for workflow planning
      },
      ollama: {
        model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
        host: process.env.OLLAMA_HOST || 'http://localhost:11434'
      }
    };

    // Track fallback events for monitoring
    this.fallbackCount = {
      arbitrator: 0,
      orchestrator: 0
    };

    this.logger.info('✅ Model Client initialized', {
      arbitratorPrimary: this.modelConfig.arbitrator.primary,
      orchestratorPrimary: this.modelConfig.orchestrator.primary,
      fallback: this.modelConfig.orchestrator.fallback
    });
  }

  /**
   * Generate a response from the Arbitrator's model (Claude Sonnet 4.5)
   *
   * The Arbitrator handles conflict resolution, which requires:
   * - Advanced reasoning capabilities
   * - Code understanding
   * - Decision-making under ambiguity
   *
   * Claude Sonnet 4.5 is chosen because:
   * - Superior reasoning for complex code conflicts
   * - Better at understanding context and intent
   * - More reliable for critical decisions
   *
   * @param {string} prompt - The user prompt/question
   * @param {Object} options - Generation options
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @param {number} options.temperature - Sampling temperature (0-1)
   * @param {Object} options.context - Additional context for the model
   * @returns {Promise<Object>} Response object with text, model used, and metadata
   */
  async generateArbitratorResponse(prompt, options = {}) {
    const config = this.modelConfig.arbitrator;
    const maxTokens = options.maxTokens || config.maxTokens;
    const temperature = options.temperature !== undefined
      ? options.temperature
      : config.temperature;

    this.logger.info('🤖 Arbitrator generating response', {
      primaryModel: config.primary,
      promptLength: prompt.length
    });

    try {
      // Try primary model (Claude Sonnet 4.5)
      const response = await this._callClaudeSonnet45(prompt, {
        maxTokens,
        temperature,
        ...options
      });

      // Record cost if tokenEconomics is available
      if (this.tokenEconomics && response.usage) {
        await this.tokenEconomics.recordCost({
          projectId: options.projectId,
          taskId: options.taskId || 'arbitrator',
          agentName: 'arbitrator',
          model: 'claude-sonnet-4-5',
          tokensInput: response.usage.input_tokens,
          tokensOutput: response.usage.output_tokens
        });
      }

      return {
        text: response.text,
        model: 'claude-sonnet-4-5',
        usage: response.usage,
        fallbackUsed: false
      };
    } catch (error) {
      this.logger.warn(
        '⚠️  Arbitrator primary model failed, falling back to Ollama',
        {
          error: error.message
        }
      );

      this.fallbackCount.arbitrator++;

      // Fallback to Ollama
      return await this._fallbackToOllama(prompt, 'arbitrator', {
        maxTokens,
        temperature,
        ...options
      });
    }
  }

  /**
   * Generate a response from the Orchestrator's model (Gemini Pro)
   *
   * The Orchestrator handles workflow coordination, which requires:
   * - Project planning and task breakdown
   * - Agent coordination
   * - Resource allocation
   *
   * Gemini Pro is chosen because:
   * - Cost-effective for high-volume operations
   * - Fast response times for workflow decisions
   * - Good balance of quality and cost
   * - Excellent at structured output
   *
   * @param {string} prompt - The user prompt/question
   * @param {Object} options - Generation options
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @param {number} options.temperature - Sampling temperature (0-1)
   * @param {Object} options.context - Additional context for the model
   * @returns {Promise<Object>} Response object with text, model used, and metadata
   */
  async generateOrchestratorResponse(prompt, options = {}) {
    const config = this.modelConfig.orchestrator;
    const maxTokens = options.maxTokens || config.maxTokens;
    const temperature = options.temperature !== undefined
      ? options.temperature
      : config.temperature;

    this.logger.info('🎯 Orchestrator generating response', {
      primaryModel: config.primary,
      promptLength: prompt.length
    });

    try {
      // Try primary model (Gemini Pro)
      const response = await this._callGemini(prompt, {
        maxTokens,
        temperature,
        ...options
      });

      // Record cost if tokenEconomics is available
      if (this.tokenEconomics && response.usage) {
        await this.tokenEconomics.recordCost({
          projectId: options.projectId,
          taskId: options.taskId || 'orchestrator',
          agentName: 'orchestrator',
          model: 'gemini-pro',
          tokensInput: response.usage.promptTokens,
          tokensOutput: response.usage.completionTokens
        });
      }

      return {
        text: response.text,
        model: 'gemini-pro',
        usage: response.usage,
        fallbackUsed: false
      };
    } catch (error) {
      this.logger.warn(
        '⚠️  Orchestrator primary model failed, falling back to Ollama',
        {
          error: error.message
        }
      );

      this.fallbackCount.orchestrator++;

      // Fallback to Ollama
      return await this._fallbackToOllama(prompt, 'orchestrator', {
        maxTokens,
        temperature,
        ...options
      });
    }
  }

  /**
   * Call Claude Sonnet 4.5 API
   *
   * @private
   * @param {string} prompt - User prompt
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  async _callClaudeSonnet45(prompt, options = {}) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const response = await this.apiClient.callAnthropic({
      model: 'claude-sonnet-4-5-20250929', // Using the latest Sonnet 4.5 model
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.3
    });

    return {
      text: response.content[0].text,
      usage: response.usage
    };
  }

  /**
   * Call Google Gemini API
   *
   * @private
   * @param {string} prompt - User prompt
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  async _callGemini(prompt, options = {}) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const model = process.env.GEMINI_MODEL || 'gemini-pro';
    const apiKey = process.env.GEMINI_API_KEY;

    // Gemini API endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2000,
          topP: parseFloat(process.env.GEMINI_TOP_P) || 0.95,
          topK: parseInt(process.env.GEMINI_TOP_K) || 40
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold:
              process.env.GEMINI_SAFETY_HARASSMENT || 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold:
              process.env.GEMINI_SAFETY_HATE_SPEECH || 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold:
              process.env.GEMINI_SAFETY_SEXUALLY_EXPLICIT
              || 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold:
              process.env.GEMINI_SAFETY_DANGEROUS || 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      },
      {
        timeout: 60000, // 60 seconds
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract text from Gemini response
    const { text } = response.data.candidates[0].content.parts[0];

    // Extract token usage (Gemini provides this in usageMetadata)
    const usage = response.data.usageMetadata || {};

    return {
      text,
      usage: {
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0
      }
    };
  }

  /**
   * Fallback to Ollama (local LLM)
   *
   * Ollama is used as the universal fallback because:
   * - Always available (runs locally)
   * - No API costs
   * - No rate limits
   * - Works offline
   * - Suitable for development/testing
   *
   * @private
   * @param {string} prompt - User prompt
   * @param {string} component - Component name (arbitrator/orchestrator)
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response object
   */
  async _fallbackToOllama(prompt, component, options = {}) {
    this.logger.info(`🔄 Using Ollama fallback for ${component}`);

    try {
      const response = await this.apiClient.callOllama({
        model: this.modelConfig.ollama.model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 2000
        }
      });

      // Log fallback event for monitoring
      if (this.contextBus) {
        await this.contextBus.incrementCounter(`fallback:${component}:ollama`);
      }

      // Record minimal cost for Ollama (computational cost, not API cost)
      if (this.tokenEconomics) {
        await this.tokenEconomics.recordCost({
          projectId: options.projectId,
          taskId: options.taskId || component,
          agentName: component,
          model: this.modelConfig.ollama.model,
          tokensInput: Math.ceil(prompt.length / 4), // Rough estimate
          tokensOutput: Math.ceil(response.response.length / 4)
        });
      }

      return {
        text: response.response,
        model: this.modelConfig.ollama.model,
        usage: {
          promptTokens: Math.ceil(prompt.length / 4),
          completionTokens: Math.ceil(response.response.length / 4)
        },
        fallbackUsed: true,
        fallbackReason: 'Primary model unavailable'
      };
    } catch (error) {
      this.logger.error(`❌ Fallback to Ollama also failed for ${component}`, {
        error: error.message
      });

      throw new Error(
        `All models failed for ${component}: Primary and Ollama unavailable`
      );
    }
  }

  /**
   * Check availability of all models
   *
   * @returns {Promise<Object>} Availability status for each model
   */
  async checkModelAvailability() {
    const status = {
      claude: {
        available: false,
        configured: !!process.env.ANTHROPIC_API_KEY
      },
      gemini: {
        available: false,
        configured: !!process.env.GEMINI_API_KEY
      },
      ollama: {
        available: false,
        configured: true // Always configured (uses default)
      }
    };

    // Check Claude
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        // Simple test call
        await this._callClaudeSonnet45('test', { maxTokens: 10 });
        status.claude.available = true;
      } catch (error) {
        status.claude.error = error.message;
      }
    }

    // Check Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        await this._callGemini('test', { maxTokens: 10 });
        status.gemini.available = true;
      } catch (error) {
        status.gemini.error = error.message;
      }
    }

    // Check Ollama
    try {
      const ollamaHost = this.modelConfig.ollama.host;
      await axios.get(`${ollamaHost}/api/tags`, { timeout: 5000 });
      status.ollama.available = true;
    } catch (error) {
      status.ollama.error = error.message;
    }

    return status;
  }

  /**
   * Get statistics about model usage and fallbacks
   *
   * @returns {Object} Usage statistics
   */
  getStats() {
    return {
      fallbackCount: this.fallbackCount,
      configuration: {
        arbitrator: {
          primary: this.modelConfig.arbitrator.primary,
          fallback: this.modelConfig.arbitrator.fallback
        },
        orchestrator: {
          primary: this.modelConfig.orchestrator.primary,
          fallback: this.modelConfig.orchestrator.fallback
        }
      },
      apiClientStats: this.apiClient.getStats()
    };
  }

  /**
   * Close all connections and cleanup
   */
  async close() {
    await this.apiClient.close();
  }
}

module.exports = ModelClient;
