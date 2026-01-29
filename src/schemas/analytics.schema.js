/**
 * Analytics Validation Schemas
 * Joi schemas for validating analytics-related requests
 */

const Joi = require('joi');

const analyticsSchemas = {
  /**
   * Get analytics data
   */
  getAnalytics: Joi.object({
    projectId: Joi.string().uuid().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    period: Joi.string()
      .valid('day', 'week', 'month', 'quarter', 'year', 'all')
      .default('month'),
    metrics: Joi.array()
      .items(
        Joi.string().valid(
          'tokenUsage',
          'costIncurred',
          'apiCalls',
          'agents',
          'conversations',
          'messages',
          'documents'
        )
      )
      .optional(),
    groupBy: Joi.string()
      .valid('date', 'project', 'agent', 'type')
      .optional(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0)
  }),

  /**
   * Get cost breakdown
   */
  getCostBreakdown: Joi.object({
    projectId: Joi.string().uuid().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    groupBy: Joi.string()
      .valid('agent', 'model', 'type', 'date')
      .default('model'),
    includeDetails: Joi.boolean().default(false)
  }),

  /**
   * Get token usage analytics
   */
  getTokenUsage: Joi.object({
    projectId: Joi.string().uuid().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    period: Joi.string()
      .valid('hour', 'day', 'week', 'month')
      .default('day'),
    models: Joi.array()
      .items(Joi.string())
      .optional(),
    breakdown: Joi.boolean().default(false)
  }),

  /**
   * Get project statistics
   */
  getProjectStats: Joi.object({
    projectId: Joi.string().uuid().required(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    includeDetails: Joi.boolean().default(false)
  }),

  /**
   * Get agent performance metrics
   */
  getAgentMetrics: Joi.object({
    agentId: Joi.string().uuid().required(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    period: Joi.string()
      .valid('hour', 'day', 'week', 'month')
      .default('week'),
    metrics: Joi.array()
      .items(
        Joi.string().valid(
          'tasksCompleted',
          'tasksFailed',
          'avgDuration',
          'successRate',
          'tokensUsed',
          'cost'
        )
      )
      .optional()
  }),

  /**
   * Get conversation analytics
   */
  getConversationAnalytics: Joi.object({
    projectId: Joi.string().uuid().optional(),
    conversationId: Joi.string().uuid().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    metrics: Joi.array()
      .items(
        Joi.string().valid(
          'messageCount',
          'avgResponseTime',
          'participantCount',
          'avgMessageLength',
          'tokensUsed'
        )
      )
      .optional()
  }),

  /**
   * Get real-time metrics
   */
  getRealtimeMetrics: Joi.object({
    projectId: Joi.string().uuid().optional(),
    refresh: Joi.number()
      .integer()
      .min(1000)
      .default(5000)
      .messages({
        'number.min': 'Refresh interval must be at least 1000ms'
      })
  }),

  /**
   * Export analytics data
   */
  exportAnalytics: Joi.object({
    projectId: Joi.string().uuid().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    format: Joi.string()
      .valid('csv', 'json', 'xlsx')
      .default('csv'),
    includeDetails: Joi.boolean().default(false)
  }),

  /**
   * Get budget usage
   */
  getBudgetUsage: Joi.object({
    period: Joi.string()
      .valid('day', 'month', 'all')
      .default('month'),
    projectId: Joi.string().uuid().optional(),
    detailed: Joi.boolean().default(false)
  }),

  /**
   * Get cost forecast
   */
  getCostForecast: Joi.object({
    days: Joi.number()
      .integer()
      .min(1)
      .max(90)
      .default(7),
    projectId: Joi.string().uuid().optional(),
    confidenceLevel: Joi.string()
      .valid('low', 'medium', 'high')
      .default('medium')
  })
};

module.exports = analyticsSchemas;
