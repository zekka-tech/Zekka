/**
 * Model Configuration
 *
 * Centralized configuration for AI models used throughout the Zekka Framework.
 * This file defines model assignments, fallback strategies, and model-specific settings.
 *
 * Model Hierarchy:
 * ================
 *
 * 1. Arbitrator Agent (Conflict Resolution)
 *    - Primary: Claude Sonnet 4.5
 *      * Advanced reasoning for complex code conflicts
 *      * Superior code understanding
 *      * Better decision-making under ambiguity
 *    - Fallback: Ollama (local)
 *      * Always available
 *      * No API costs
 *      * Suitable for development/testing
 *
 * 2. Orchestrator (Workflow Coordination)
 *    - Primary: Gemini Pro
 *      * Cost-effective for high-volume operations
 *      * Fast response times
 *      * Excellent at structured output
 *      * Good balance of quality and cost
 *    - Fallback: Ollama (local)
 *      * Same as above
 *
 * 3. General Agents (Task Execution)
 *    - Determined by Token Economics based on:
 *      * Task complexity
 *      * Budget availability
 *      * Performance requirements
 *    - Fallback: Ollama (always)
 *
 * Fallback Strategy:
 * ==================
 * - Primary model fails → Automatic fallback to Ollama
 * - Triggers for fallback:
 *   * API unavailable (network issues)
 *   * Rate limits exceeded
 *   * API key not configured
 *   * Authentication failures
 *   * Circuit breaker open
 * - All fallbacks are logged for monitoring
 *
 * @module config/models
 */

require('dotenv').config();

/**
 * Model definitions with pricing and capabilities
 */
const MODELS = {
  // Anthropic Claude Models
  'claude-sonnet-4-5': {
    provider: 'anthropic',
    apiModel: 'claude-sonnet-4-5-20250929',
    displayName: 'Claude Sonnet 4.5',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    pricing: {
      input: 0.003,  // $3 per 1M input tokens
      output: 0.015  // $15 per 1M output tokens
    },
    capabilities: ['reasoning', 'code', 'analysis', 'long-context'],
    recommendedFor: ['arbitrator', 'complex-reasoning', 'code-review'],
    defaultTemperature: 0.3
  },
  'claude-opus-4-5': {
    provider: 'anthropic',
    apiModel: 'claude-opus-4-5-20251101',
    displayName: 'Claude Opus 4.5',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    pricing: {
      input: 0.015,  // $15 per 1M input tokens
      output: 0.075  // $75 per 1M output tokens
    },
    capabilities: ['advanced-reasoning', 'code', 'analysis', 'long-context', 'complex-tasks'],
    recommendedFor: ['critical-decisions', 'complex-analysis'],
    defaultTemperature: 0.3
  },
  'claude-haiku': {
    provider: 'anthropic',
    apiModel: 'claude-3-haiku-20240307',
    displayName: 'Claude Haiku',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    pricing: {
      input: 0.00025,  // $0.25 per 1M input tokens
      output: 0.00125  // $1.25 per 1M output tokens
    },
    capabilities: ['fast', 'code', 'analysis'],
    recommendedFor: ['simple-tasks', 'budget-conscious'],
    defaultTemperature: 0.7
  },

  // Google Gemini Models
  'gemini-pro': {
    provider: 'google',
    apiModel: 'gemini-pro',
    displayName: 'Gemini Pro',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    pricing: {
      input: 0.000125,   // $0.125 per 1M input tokens (free tier: 60 RPM)
      output: 0.000375   // $0.375 per 1M output tokens
    },
    capabilities: ['reasoning', 'code', 'structured-output', 'fast'],
    recommendedFor: ['orchestrator', 'workflow-planning', 'high-volume'],
    defaultTemperature: 0.7
  },
  'gemini-pro-vision': {
    provider: 'google',
    apiModel: 'gemini-pro-vision',
    displayName: 'Gemini Pro Vision',
    contextWindow: 16384,
    maxOutputTokens: 4096,
    pricing: {
      input: 0.000125,
      output: 0.000375
    },
    capabilities: ['vision', 'reasoning', 'multimodal'],
    recommendedFor: ['image-analysis', 'ui-review'],
    defaultTemperature: 0.7
  },
  'gemini-1.5-pro': {
    provider: 'google',
    apiModel: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    contextWindow: 1000000,  // 1M tokens!
    maxOutputTokens: 8192,
    pricing: {
      input: 0.00125,   // $1.25 per 1M input tokens
      output: 0.005     // $5 per 1M output tokens
    },
    capabilities: ['long-context', 'reasoning', 'code', 'multimodal'],
    recommendedFor: ['long-documents', 'large-codebases'],
    defaultTemperature: 0.7
  },

  // Ollama (Local) Models
  'llama3.1:8b': {
    provider: 'ollama',
    apiModel: 'llama3.1:8b',
    displayName: 'Llama 3.1 8B',
    contextWindow: 8192,
    maxOutputTokens: 2048,
    pricing: {
      input: 0.0001,   // Minimal computational cost
      output: 0.0001
    },
    capabilities: ['general', 'code', 'reasoning'],
    recommendedFor: ['fallback', 'development', 'offline'],
    defaultTemperature: 0.7
  },
  'codellama': {
    provider: 'ollama',
    apiModel: 'codellama',
    displayName: 'CodeLlama',
    contextWindow: 8192,
    maxOutputTokens: 2048,
    pricing: {
      input: 0.0001,
      output: 0.0001
    },
    capabilities: ['code', 'completion', 'analysis'],
    recommendedFor: ['code-generation', 'fallback'],
    defaultTemperature: 0.2
  },
  'mistral': {
    provider: 'ollama',
    apiModel: 'mistral',
    displayName: 'Mistral',
    contextWindow: 8192,
    maxOutputTokens: 2048,
    pricing: {
      input: 0.0001,
      output: 0.0001
    },
    capabilities: ['fast', 'general'],
    recommendedFor: ['simple-tasks', 'fallback'],
    defaultTemperature: 0.7
  }
};

/**
 * Component-specific model assignments
 */
const COMPONENT_MODELS = {
  arbitrator: {
    // Arbitrator uses Claude Sonnet 4.5 for superior conflict resolution
    primary: process.env.ARBITRATOR_MODEL || 'claude-sonnet-4-5',
    fallback: process.env.FALLBACK_MODEL || 'llama3.1:8b',
    description: 'AI-powered conflict resolution requires advanced reasoning',
    maxTokens: 4000,
    temperature: 0.3  // Lower temperature for deterministic decisions
  },
  orchestrator: {
    // Orchestrator uses Gemini Pro for cost-effective workflow coordination
    primary: process.env.ORCHESTRATOR_MODEL || 'gemini-pro',
    fallback: process.env.FALLBACK_MODEL || 'llama3.1:8b',
    description: 'Workflow coordination optimized for cost and performance',
    maxTokens: 2000,
    temperature: 0.7  // Moderate temperature for planning
  },
  agents: {
    // General agents use token economics for dynamic selection
    description: 'Model selected dynamically based on task complexity and budget',
    selectionStrategy: 'token-economics'
  }
};

/**
 * Fallback configuration
 */
const FALLBACK_CONFIG = {
  enabled: true,
  strategy: 'primary-to-ollama',  // Primary → Ollama
  retryAttempts: 2,                // Retry primary model twice before fallback
  retryDelay: 1000,                // Wait 1s between retries
  logFallbacks: true,              // Log all fallback events
  alertThreshold: 10               // Alert if >10 fallbacks per hour
};

/**
 * API Configuration
 */
const API_CONFIG = {
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    apiVersion: '2023-06-01',
    timeout: 60000,
    requiredEnvVar: 'ANTHROPIC_API_KEY'
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    timeout: 60000,
    requiredEnvVar: 'GEMINI_API_KEY',
    safetySettings: {
      harassment: process.env.GEMINI_SAFETY_HARASSMENT || 'BLOCK_MEDIUM_AND_ABOVE',
      hateSpeech: process.env.GEMINI_SAFETY_HATE_SPEECH || 'BLOCK_MEDIUM_AND_ABOVE',
      sexuallyExplicit: process.env.GEMINI_SAFETY_SEXUALLY_EXPLICIT || 'BLOCK_MEDIUM_AND_ABOVE',
      dangerous: process.env.GEMINI_SAFETY_DANGEROUS || 'BLOCK_MEDIUM_AND_ABOVE'
    }
  },
  ollama: {
    baseUrl: process.env.OLLAMA_HOST || 'http://localhost:11434',
    timeout: 120000,  // 2 minutes for local processing
    requiredEnvVar: null  // No API key needed
  }
};

/**
 * Get model configuration by name
 *
 * @param {string} modelName - Model name
 * @returns {Object} Model configuration
 */
function getModelConfig(modelName) {
  const config = MODELS[modelName];
  if (!config) {
    throw new Error(`Unknown model: ${modelName}`);
  }
  return config;
}

/**
 * Get component configuration by name
 *
 * @param {string} componentName - Component name (arbitrator, orchestrator, etc.)
 * @returns {Object} Component configuration
 */
function getComponentConfig(componentName) {
  const config = COMPONENT_MODELS[componentName];
  if (!config) {
    throw new Error(`Unknown component: ${componentName}`);
  }
  return config;
}

/**
 * Check if a model is available (API key configured)
 *
 * @param {string} modelName - Model name
 * @returns {boolean} True if model is available
 */
function isModelAvailable(modelName) {
  const model = getModelConfig(modelName);
  const apiConfig = API_CONFIG[model.provider];

  // Ollama doesn't require API key
  if (model.provider === 'ollama') {
    return true;
  }

  // Check if required env var is set
  return !!process.env[apiConfig.requiredEnvVar];
}

/**
 * Get fallback model for a component
 *
 * @param {string} componentName - Component name
 * @returns {string} Fallback model name
 */
function getFallbackModel(componentName) {
  const config = getComponentConfig(componentName);
  return config.fallback;
}

/**
 * Calculate cost for a model usage
 *
 * @param {string} modelName - Model name
 * @param {number} inputTokens - Input tokens
 * @param {number} outputTokens - Output tokens
 * @returns {number} Cost in USD
 */
function calculateCost(modelName, inputTokens, outputTokens) {
  const model = getModelConfig(modelName);
  const inputCost = (inputTokens / 1000000) * model.pricing.input;
  const outputCost = (outputTokens / 1000000) * model.pricing.output;
  return inputCost + outputCost;
}

/**
 * Export configuration
 */
module.exports = {
  MODELS,
  COMPONENT_MODELS,
  FALLBACK_CONFIG,
  API_CONFIG,
  getModelConfig,
  getComponentConfig,
  isModelAvailable,
  getFallbackModel,
  calculateCost
};
