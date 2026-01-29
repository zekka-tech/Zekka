/**
 * Agent Validation Schemas
 * Joi schemas for validating agent-related requests
 */

const Joi = require('joi');

const agentsSchemas = {
  /**
   * List agents query parameters
   */
  listAgents: Joi.object({
    projectId: Joi.string().uuid().optional(),
    status: Joi.string()
      .valid('active', 'inactive', 'error', 'paused')
      .optional(),
    search: Joi.string().max(255).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0)
  }),

  /**
   * Create agent
   */
  createAgent: Joi.object({
    projectId: Joi.string().uuid().required(),
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    type: Joi.string()
      .valid('researcher', 'coder', 'tester', 'reviewer', 'planner', 'executor')
      .required(),
    capabilities: Joi.array()
      .items(Joi.string())
      .optional(),
    config: Joi.object({
      temperature: Joi.number().min(0).max(1).optional(),
      maxTokens: Joi.number().integer().min(100).optional(),
      timeout: Joi.number().integer().min(1000).optional(),
      retries: Joi.number().integer().min(0).max(5).optional()
    }).optional(),
    metadata: Joi.object().optional()
  }),

  /**
   * Update agent
   */
  updateAgent: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional(),
    status: Joi.string()
      .valid('active', 'inactive', 'paused')
      .optional(),
    type: Joi.string()
      .valid('researcher', 'coder', 'tester', 'reviewer', 'planner', 'executor')
      .optional(),
    capabilities: Joi.array()
      .items(Joi.string())
      .optional(),
    config: Joi.object({
      temperature: Joi.number().min(0).max(1).optional(),
      maxTokens: Joi.number().integer().min(100).optional(),
      timeout: Joi.number().integer().min(1000).optional(),
      retries: Joi.number().integer().min(0).max(5).optional()
    }).optional(),
    metadata: Joi.object().optional()
  }).min(1),

  /**
   * Agent ID parameter
   */
  agentIdParam: Joi.object({
    id: Joi.string().uuid().required()
  }),

  /**
   * Agent task execution
   */
  executeTask: Joi.object({
    taskDescription: Joi.string().min(1).max(5000).required(),
    priority: Joi.string()
      .valid('low', 'medium', 'high', 'critical')
      .default('medium'),
    context: Joi.object().optional(),
    metadata: Joi.object().optional()
  }),

  /**
   * Agent status update
   */
  updateStatus: Joi.object({
    status: Joi.string()
      .valid('active', 'inactive', 'error', 'paused')
      .required(),
    message: Joi.string().max(500).optional()
  }),

  /**
   * Agent metrics query
   */
  getMetrics: Joi.object({
    period: Joi.string()
      .valid('hour', 'day', 'week', 'month')
      .default('day'),
    metrics: Joi.array()
      .items(
        Joi.string().valid(
          'tasksCompleted',
          'tasksFailed',
          'avgDuration',
          'successRate',
          'tokensUsed',
          'costIncurred'
        )
      )
      .optional()
  })
};

module.exports = agentsSchemas;
