/**
 * Economic Orchestrator Service
 * Intelligent routing based on cost/performance trade-offs
 * Target: 47% cost reduction ($1.20 per story point)
 */

const axios = require('axios');

class EconomicOrchestrator {
  constructor() {
    this.tiers = {
      local_alama: {
        cost_per_1k_tokens: 0.001,
        latency_p95_ms: 200,
        capacity_rps: 50,
        reliability: 0.95
      },
      elastic_gpu: {
        cost_per_1k_tokens: 0.005,
        latency_p95_ms: 500,
        capacity_rps: 200,
        reliability: 0.99
      },
      premium_api: {
        cost_per_1k_tokens: 0.03,
        latency_p95_ms: 1000,
        capacity_rps: 1000,
        reliability: 0.999
      }
    };

    this.costTarget = 1.2; // $ per story point
    this.currentSpend = 0;
    this.metrics = {
      requests_routed: {},
      cost_savings: 0,
      fallback_count: 0
    };
  }

  /**
   * Route inference request based on economic mode
   * @param {Object} request - Inference request
   * @param {string} mode - Economic mode: 'cost_optimized', 'balanced', 'performance'
   * @returns {Promise<Object>} Inference result
   */
  async route(request, mode = 'balanced') {
    const complexity = this.estimateComplexity(request);
    const budget = this.calculateBudget(request);

    // Decision matrix
    let selectedTier;

    if (mode === 'cost_optimized') {
      selectedTier = this.selectCostOptimized(complexity, budget);
    } else if (mode === 'performance') {
      selectedTier = this.selectPerformance(complexity, budget);
    } else {
      selectedTier = this.selectBalanced(complexity, budget);
    }

    try {
      const result = await this.executeInference(selectedTier, request);
      this.recordMetrics(selectedTier, result, true);
      return result;
    } catch (error) {
      // Fallback logic
      const fallbackTier = this.selectFallback(selectedTier);
      const result = await this.executeInference(fallbackTier, request);
      this.recordMetrics(fallbackTier, result, false);
      this.metrics.fallback_count++;
      return result;
    }
  }

  selectCostOptimized(complexity, budget) {
    // Always try local ALAMA first
    if (complexity <= 3 && this.isAlamaAvailable()) {
      return 'local_alama';
    }

    // Use elastic pool for medium complexity
    if (complexity <= 7 && budget > 0.01) {
      return 'elastic_gpu';
    }

    // Premium only for high complexity
    return 'premium_api';
  }

  selectBalanced(complexity, budget) {
    const alamaLoad = this.getAlamaLoad();

    // Route 80% to local ALAMA when available
    if (complexity <= 5 && alamaLoad < 0.8) {
      return 'local_alama';
    }

    // Elastic pool for overflow
    if (complexity <= 8) {
      return 'elastic_gpu';
    }

    return 'premium_api';
  }

  selectPerformance(complexity, budget) {
    // Skip local ALAMA for performance mode
    if (complexity <= 8) {
      return 'elastic_gpu';
    }
    return 'premium_api';
  }

  estimateComplexity(request) {
    const { input_tokens, task_type, context_size } = request;

    let score = 0;

    // Token count
    if (input_tokens < 500) score += 1;
    else if (input_tokens < 2000) score += 3;
    else if (input_tokens < 8000) score += 5;
    else score += 8;

    // Task type
    const taskScores = {
      simple_qa: 1,
      code_generation: 4,
      complex_reasoning: 7,
      multi_step_planning: 9
    };
    score += taskScores[task_type] || 5;

    // Context size
    score += Math.min(Math.floor(context_size / 1000), 3);

    return Math.min(score, 10);
  }

  calculateBudget(request) {
    const { input_tokens, estimated_output_tokens } = request;
    const total_tokens = input_tokens + (estimated_output_tokens || input_tokens);

    // Budget = cost_target * (tokens / avg_tokens_per_story_point)
    const avg_tokens_per_sp = 5000;
    return this.costTarget * (total_tokens / avg_tokens_per_sp);
  }

  async executeInference(tier, request) {
    const startTime = Date.now();

    let result;
    switch (tier) {
    case 'local_alama':
      result = await this.invokeAlama(request);
      break;
    case 'elastic_gpu':
      result = await this.invokeElasticGPU(request);
      break;
    case 'premium_api':
      result = await this.invokePremiumAPI(request);
      break;
    default:
      throw new Error(`Unknown tier: ${tier}`);
    }

    result.latency_ms = Date.now() - startTime;
    result.tier = tier;
    return result;
  }

  async invokeAlama(request) {
    // Call local ALAMA service
    try {
      const response = await axios.post(
        'http://alama-inference.zekka-production.svc.cluster.local:8080/infer',
        request,
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      throw new Error(`ALAMA inference failed: ${error.message}`);
    }
  }

  async invokeElasticGPU(request) {
    // Call elastic GPU pool (with auto-scaling)
    try {
      const response = await axios.post(
        'http://elastic-gpu-pool.zekka-production.svc.cluster.local:8080/infer',
        request,
        { timeout: 15000 }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Elastic GPU inference failed: ${error.message}`);
    }
  }

  async invokePremiumAPI(request) {
    // Call premium API (GPT-4, Claude, etc.)
    // Implementation depends on provider
    // For now, mock implementation
    return {
      output: 'Premium API response',
      input_tokens: request.input_tokens || 1000,
      output_tokens: request.estimated_output_tokens || 1000
    };
  }

  recordMetrics(tier, result, success) {
    if (!this.metrics.requests_routed[tier]) {
      this.metrics.requests_routed[tier] = 0;
    }
    this.metrics.requests_routed[tier]++;

    const cost = this.calculateCost(tier, result);
    this.currentSpend += cost;

    // Calculate savings vs. using premium API only
    const premiumCost = this.calculateCost('premium_api', result);
    this.metrics.cost_savings += premiumCost - cost;
  }

  calculateCost(tier, result) {
    const { input_tokens, output_tokens } = result;
    const total_tokens = (input_tokens || 0) + (output_tokens || 0);
    return (total_tokens / 1000) * this.tiers[tier].cost_per_1k_tokens;
  }

  isAlamaAvailable() {
    // Check ALAMA service health
    // TODO: Implement health check
    return true;
  }

  getAlamaLoad() {
    // Get current ALAMA load from metrics
    // TODO: Query Prometheus
    return 0.5; // Placeholder
  }

  selectFallback(tier) {
    // Fallback hierarchy: local_alama → elastic_gpu → premium_api
    const hierarchy = ['local_alama', 'elastic_gpu', 'premium_api'];
    const currentIndex = hierarchy.indexOf(tier);
    return hierarchy[Math.min(currentIndex + 1, hierarchy.length - 1)];
  }

  getMetrics() {
    const totalRequests = Object.values(this.metrics.requests_routed).reduce(
      (a, b) => a + b,
      0
    );
    const avgCostPerRequest = totalRequests > 0 ? this.currentSpend / totalRequests : 0;

    return {
      total_requests: totalRequests,
      requests_by_tier: this.metrics.requests_routed,
      total_spend: this.currentSpend.toFixed(4),
      cost_savings: this.metrics.cost_savings.toFixed(4),
      avg_cost_per_request: avgCostPerRequest.toFixed(4),
      cost_per_story_point: (this.currentSpend / (totalRequests / 100)).toFixed(
        2
      ), // Assume 100 requests per story point
      fallback_rate:
        totalRequests > 0
          ? `${((this.metrics.fallback_count / totalRequests) * 100).toFixed(2)}%`
          : '0%',
      cost_reduction:
        this.metrics.cost_savings > 0
          ? `${((this.metrics.cost_savings / (this.currentSpend + this.metrics.cost_savings)) * 100).toFixed(1)}%`
          : '0%'
    };
  }
}

module.exports = EconomicOrchestrator;
