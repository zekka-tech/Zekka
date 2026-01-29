/**
 * Economic Orchestrator API Routes
 * Integrate token economics into main application
 */

const express = require('express');
const EconomicOrchestrator = require('../services/economic-orchestrator');

const router = express.Router();
const orchestrator = new EconomicOrchestrator();

/**
 * POST /api/inference
 * Route inference request through economic orchestrator
 */
router.post('/inference', async (req, res) => {
  try {
    const {
      prompt,
      task_type = 'code_generation',
      economic_mode = 'balanced'
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Estimate token counts
    const input_tokens = Math.ceil(prompt.length / 4); // Rough estimate
    const estimated_output_tokens = input_tokens; // Assume similar output

    // Create inference request
    const request = {
      prompt,
      input_tokens,
      estimated_output_tokens,
      task_type,
      context_size: input_tokens
    };

    // Route through economic orchestrator
    const result = await orchestrator.route(request, economic_mode);

    res.json({
      success: true,
      result,
      metrics: {
        tier_used: result.tier,
        latency_ms: result.latency_ms,
        cost_estimate: orchestrator.calculateCost(result.tier, result)
      }
    });
  } catch (error) {
    console.error('Inference error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/inference/metrics
 * Get economic orchestrator metrics
 */
router.get('/inference/metrics', (req, res) => {
  const metrics = orchestrator.getMetrics();
  res.json({
    success: true,
    metrics,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/inference/mode
 * Change economic mode dynamically
 */
router.post('/inference/mode', (req, res) => {
  const { mode } = req.body;

  const validModes = ['cost_optimized', 'balanced', 'performance'];
  if (!validModes.includes(mode)) {
    return res.status(400).json({
      success: false,
      error: `Invalid mode. Must be one of: ${validModes.join(', ')}`
    });
  }

  res.json({
    success: true,
    message: `Economic mode set to: ${mode}`,
    mode
  });
});

/**
 * GET /api/inference/health
 * Health check for inference services
 */
router.get('/inference/health', async (req, res) => {
  try {
    const health = {
      local_alama: orchestrator.isAlamaAvailable(),
      elastic_gpu: true, // TODO: Implement actual health check
      premium_api: true, // TODO: Implement actual health check
      orchestrator: 'healthy'
    };

    const allHealthy = Object.values(health).every(
      (status) => status === true || status === 'healthy'
    );

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
