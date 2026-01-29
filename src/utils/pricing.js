/**
 * Model Pricing Configuration
 *
 * Defines pricing per model for cost tracking and analytics
 * Prices are in USD per 1M tokens
 */

/**
 * Model pricing configuration
 * Prices in USD per 1 million tokens
 */
const MODEL_PRICING = {
  // Claude Models
  'claude-sonnet-4-5': {
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    inputPrice: 3.0, // $3 per 1M input tokens
    outputPrice: 15.0, // $15 per 1M output tokens
    contextWindow: 200000,
    description: 'Most powerful model for complex reasoning'
  },
  'claude-sonnet-3-5': {
    name: 'Claude Sonnet 3.5',
    provider: 'anthropic',
    inputPrice: 3.0,
    outputPrice: 15.0,
    contextWindow: 200000,
    description: 'Balanced performance and cost'
  },
  'claude-haiku-3-5': {
    name: 'Claude Haiku 3.5',
    provider: 'anthropic',
    inputPrice: 0.8,
    outputPrice: 4.0,
    contextWindow: 200000,
    description: 'Fast and cost-effective'
  },

  // OpenAI Models
  'gpt-4': {
    name: 'GPT-4',
    provider: 'openai',
    inputPrice: 30.0,
    outputPrice: 60.0,
    contextWindow: 8192,
    description: 'OpenAI flagship model'
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    provider: 'openai',
    inputPrice: 10.0,
    outputPrice: 30.0,
    contextWindow: 128000,
    description: 'Faster GPT-4 with larger context'
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    inputPrice: 0.5,
    outputPrice: 1.5,
    contextWindow: 16385,
    description: 'Fast and economical'
  },

  // Google Gemini Models
  'gemini-pro': {
    name: 'Gemini Pro',
    provider: 'google',
    inputPrice: 0.125,
    outputPrice: 0.375,
    contextWindow: 32760,
    description: 'High-volume orchestration model'
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    inputPrice: 1.25,
    outputPrice: 5.0,
    contextWindow: 1000000,
    description: 'Long context model'
  },

  // DeepSeek Models
  'deepseek-r1': {
    name: 'DeepSeek R1',
    provider: 'deepseek',
    inputPrice: 0.55,
    outputPrice: 2.19,
    contextWindow: 64000,
    description: 'OCR and visual processing'
  },

  // Ollama (Local) Models - Free
  'llama3.1:8b': {
    name: 'Llama 3.1 8B',
    provider: 'ollama',
    inputPrice: 0.0,
    outputPrice: 0.0,
    contextWindow: 128000,
    description: 'Local, zero-cost model'
  },
  'llama3.1:70b': {
    name: 'Llama 3.1 70B',
    provider: 'ollama',
    inputPrice: 0.0,
    outputPrice: 0.0,
    contextWindow: 128000,
    description: 'Larger local model'
  },
  mistral: {
    name: 'Mistral',
    provider: 'ollama',
    inputPrice: 0.0,
    outputPrice: 0.0,
    contextWindow: 32768,
    description: 'Local Mistral model'
  },
  codellama: {
    name: 'Code Llama',
    provider: 'ollama',
    inputPrice: 0.0,
    outputPrice: 0.0,
    contextWindow: 100000,
    description: 'Code-specialized local model'
  },

  // Other Models
  'kimi-k2': {
    name: 'Kimi K2',
    provider: 'moonshot',
    inputPrice: 0.5,
    outputPrice: 2.0,
    contextWindow: 1000000,
    description: 'Long context tasks'
  },
  grok: {
    name: 'Grok',
    provider: 'xai',
    inputPrice: 5.0,
    outputPrice: 15.0,
    contextWindow: 32000,
    description: 'Real-time information model'
  }
};

/**
 * Calculate cost for token usage
 * @param {string} model - Model identifier
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {number} Total cost in USD
 */
function calculateCost(model, inputTokens = 0, outputTokens = 0) {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    console.warn(`Unknown model: ${model}, using zero cost`);
    return 0;
  }

  // Convert tokens to millions and calculate cost
  const inputCost = (inputTokens / 1000000) * pricing.inputPrice;
  const outputCost = (outputTokens / 1000000) * pricing.outputPrice;

  return inputCost + outputCost;
}

/**
 * Get pricing information for a model
 * @param {string} model - Model identifier
 * @returns {object|null} Pricing information or null if not found
 */
function getModelPricing(model) {
  return MODEL_PRICING[model] || null;
}

/**
 * Get all available models
 * @returns {object} All model pricing configurations
 */
function getAllModels() {
  return MODEL_PRICING;
}

/**
 * Get models by provider
 * @param {string} provider - Provider name (anthropic, openai, google, etc.)
 * @returns {object} Models from the specified provider
 */
function getModelsByProvider(provider) {
  return Object.entries(MODEL_PRICING)
    .filter(([_, config]) => config.provider === provider)
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
}

/**
 * Calculate cost breakdown
 * @param {string} model - Model identifier
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {object} Detailed cost breakdown
 */
function calculateCostBreakdown(model, inputTokens = 0, outputTokens = 0) {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    return {
      model,
      found: false,
      inputTokens: 0,
      outputTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0
    };
  }

  const inputCost = (inputTokens / 1000000) * pricing.inputPrice;
  const outputCost = (outputTokens / 1000000) * pricing.outputPrice;

  return {
    model,
    modelName: pricing.name,
    provider: pricing.provider,
    found: true,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputPrice: pricing.inputPrice,
    outputPrice: pricing.outputPrice,
    inputCost: Number(inputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    totalCost: Number((inputCost + outputCost).toFixed(6))
  };
}

/**
 * Estimate cost for a given number of tokens
 * @param {string} model - Model identifier
 * @param {number} estimatedTokens - Estimated total tokens
 * @param {number} inputOutputRatio - Ratio of input to output (default 0.7 = 70% input, 30% output)
 * @returns {object} Estimated cost breakdown
 */
function estimateCost(model, estimatedTokens, inputOutputRatio = 0.7) {
  const inputTokens = Math.floor(estimatedTokens * inputOutputRatio);
  const outputTokens = estimatedTokens - inputTokens;

  return calculateCostBreakdown(model, inputTokens, outputTokens);
}

/**
 * Compare costs across models for a given token count
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {Array} Array of cost comparisons sorted by total cost
 */
function compareCosts(inputTokens, outputTokens) {
  const comparisons = Object.keys(MODEL_PRICING).map((model) => calculateCostBreakdown(model, inputTokens, outputTokens));

  return comparisons.sort((a, b) => a.totalCost - b.totalCost);
}

/**
 * Get cheapest model for a given context window requirement
 * @param {number} requiredContext - Required context window size
 * @returns {object|null} Cheapest model that meets requirements
 */
function getCheapestModel(requiredContext) {
  const validModels = Object.entries(MODEL_PRICING)
    .filter(([_, config]) => config.contextWindow >= requiredContext)
    .map(([key, config]) => ({
      model: key,
      ...config,
      avgPrice: (config.inputPrice + config.outputPrice) / 2
    }))
    .sort((a, b) => a.avgPrice - b.avgPrice);

  return validModels.length > 0 ? validModels[0] : null;
}

module.exports = {
  MODEL_PRICING,
  calculateCost,
  getModelPricing,
  getAllModels,
  getModelsByProvider,
  calculateCostBreakdown,
  estimateCost,
  compareCosts,
  getCheapestModel
};
