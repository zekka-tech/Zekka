/**
 * Analytics Service
 *
 * Provides metrics, cost tracking, and analytics for projects, agents, and users
 * Includes token usage tracking, cost calculations, and performance metrics
 */

const { pool } = require('../config/database');
const { calculateCost, getModelPricing } = require('../utils/pricing');
const { cache, CACHE_KEYS, TTL } = require('../config/redis');
const logger = require('../utils/logger');

class AnalyticsService {
  /**
   * Get metrics for a user's projects
   * @param {number} userId - User ID
   * @param {string} period - Time period ('day', 'week', 'month', 'all')
   * @returns {Promise<object>} Aggregated metrics
   */
  async getMetrics(userId, period = 'month') {
    const timeFilter = this._getTimeFilter(period);
    const cacheKey = CACHE_KEYS.CACHE(`metrics:user:${userId}:${period}`);

    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const query = `
      SELECT
        COUNT(DISTINCT p.id) as total_projects,
        COUNT(DISTINCT c.id) as total_conversations,
        COUNT(DISTINCT m.id) as total_messages,
        COALESCE(SUM(tu.input_tokens), 0)::bigint as total_input_tokens,
        COALESCE(SUM(tu.output_tokens), 0)::bigint as total_output_tokens,
        COALESCE(SUM(tu.cost), 0)::decimal(10,6) as total_cost,
        COUNT(DISTINCT tu.model) as models_used,
        COUNT(DISTINCT a.agent_id) as agents_used
      FROM users u
      LEFT JOIN projects p ON p.user_id = u.id ${timeFilter ? `AND p.created_at >= ${timeFilter}` : ''}
      LEFT JOIN conversations c ON c.project_id = p.id
      LEFT JOIN messages m ON m.conversation_id = c.id
      LEFT JOIN token_usage tu ON tu.conversation_id = c.id
      LEFT JOIN agent_activities a ON a.project_id = p.id ${timeFilter ? `AND a.timestamp >= ${timeFilter}` : ''}
      WHERE u.id = $1
      GROUP BY u.id
    `;

    const result = await pool.query(query, [userId]);
    const metrics = result.rows[0] || {
      total_projects: 0,
      total_conversations: 0,
      total_messages: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost: 0,
      models_used: 0,
      agents_used: 0
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, metrics, TTL.SHORT);

    return metrics;
  }

  /**
   * Get cost data by model and agent
   * @param {number} userId - User ID
   * @param {string} period - Time period
   * @returns {Promise<object>} Cost breakdown
   */
  async getCosts(userId, period = 'month') {
    const timeFilter = this._getTimeFilter(period);
    const cacheKey = CACHE_KEYS.CACHE(`costs:user:${userId}:${period}`);

    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const query = `
      SELECT
        tu.model,
        tu.agent_id,
        COUNT(*) as usage_count,
        SUM(tu.input_tokens)::bigint as total_input_tokens,
        SUM(tu.output_tokens)::bigint as total_output_tokens,
        SUM(tu.cost)::decimal(10,6) as total_cost,
        AVG(tu.cost)::decimal(10,6) as avg_cost,
        MIN(tu.created_at) as first_used,
        MAX(tu.created_at) as last_used
      FROM token_usage tu
      JOIN conversations c ON c.id = tu.conversation_id
      JOIN projects p ON p.id = c.project_id
      WHERE p.user_id = $1
        ${timeFilter ? `AND tu.created_at >= ${timeFilter}` : ''}
      GROUP BY tu.model, tu.agent_id
      ORDER BY total_cost DESC
    `;

    const result = await pool.query(query, [userId]);

    const costs = {
      byModel: {},
      byAgent: {},
      total: 0,
      items: result.rows
    };

    // Aggregate by model and agent
    result.rows.forEach((row) => {
      const { model } = row;
      const agentId = row.agent_id || 'unknown';
      const cost = parseFloat(row.total_cost);

      // By model
      if (!costs.byModel[model]) {
        costs.byModel[model] = {
          model,
          cost: 0,
          inputTokens: 0,
          outputTokens: 0,
          count: 0
        };
      }
      costs.byModel[model].cost += cost;
      costs.byModel[model].inputTokens += parseInt(row.total_input_tokens);
      costs.byModel[model].outputTokens += parseInt(row.total_output_tokens);
      costs.byModel[model].count += parseInt(row.usage_count);

      // By agent
      if (!costs.byAgent[agentId]) {
        costs.byAgent[agentId] = {
          agentId,
          cost: 0,
          inputTokens: 0,
          outputTokens: 0,
          count: 0
        };
      }
      costs.byAgent[agentId].cost += cost;
      costs.byAgent[agentId].inputTokens += parseInt(row.total_input_tokens);
      costs.byAgent[agentId].outputTokens += parseInt(row.total_output_tokens);
      costs.byAgent[agentId].count += parseInt(row.usage_count);

      costs.total += cost;
    });

    await cache.set(cacheKey, costs, TTL.SHORT);
    return costs;
  }

  /**
   * Get detailed cost breakdown
   * @param {number} userId - User ID
   * @returns {Promise<object>} Detailed cost breakdown
   */
  async getCostsBreakdown(userId) {
    const query = `
      SELECT
        DATE(tu.created_at) as date,
        tu.model,
        tu.agent_id,
        SUM(tu.input_tokens)::bigint as input_tokens,
        SUM(tu.output_tokens)::bigint as output_tokens,
        SUM(tu.cost)::decimal(10,6) as cost
      FROM token_usage tu
      JOIN conversations c ON c.id = tu.conversation_id
      JOIN projects p ON p.id = c.project_id
      WHERE p.user_id = $1
        AND tu.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(tu.created_at), tu.model, tu.agent_id
      ORDER BY date DESC, cost DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get token usage timeline
   * @param {number} userId - User ID
   * @param {string} period - Time period
   * @returns {Promise<Array>} Token usage over time
   */
  async getTokenUsage(userId, period = 'month') {
    const timeFilter = this._getTimeFilter(period);
    const groupBy = period === 'day' ? 'hour' : 'day';

    let query;
    if (groupBy === 'hour') {
      query = `
        SELECT
          DATE_TRUNC('hour', tu.created_at) as time_bucket,
          SUM(tu.input_tokens)::bigint as input_tokens,
          SUM(tu.output_tokens)::bigint as output_tokens,
          SUM(tu.cost)::decimal(10,6) as cost,
          COUNT(*) as request_count
        FROM token_usage tu
        JOIN conversations c ON c.id = tu.conversation_id
        JOIN projects p ON p.id = c.project_id
        WHERE p.user_id = $1
          ${timeFilter ? `AND tu.created_at >= ${timeFilter}` : ''}
        GROUP BY DATE_TRUNC('hour', tu.created_at)
        ORDER BY time_bucket ASC
      `;
    } else {
      query = `
        SELECT
          DATE(tu.created_at) as time_bucket,
          SUM(tu.input_tokens)::bigint as input_tokens,
          SUM(tu.output_tokens)::bigint as output_tokens,
          SUM(tu.cost)::decimal(10,6) as cost,
          COUNT(*) as request_count
        FROM token_usage tu
        JOIN conversations c ON c.id = tu.conversation_id
        JOIN projects p ON p.id = c.project_id
        WHERE p.user_id = $1
          ${timeFilter ? `AND tu.created_at >= ${timeFilter}` : ''}
        GROUP BY DATE(tu.created_at)
        ORDER BY time_bucket ASC
      `;
    }

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get agent performance metrics
   * @param {string} agentId - Agent ID
   * @param {string} period - Time period
   * @returns {Promise<object>} Agent metrics
   */
  async getAgentMetrics(agentId, period = 'month') {
    const timeFilter = this._getTimeFilter(period);
    const cacheKey = CACHE_KEYS.CACHE(`agent-metrics:${agentId}:${period}`);

    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const query = `
      SELECT
        COUNT(DISTINCT aa.project_id) as projects_worked,
        COUNT(*) as total_actions,
        SUM(tu.input_tokens)::bigint as total_input_tokens,
        SUM(tu.output_tokens)::bigint as total_output_tokens,
        SUM(tu.cost)::decimal(10,6) as total_cost,
        AVG(tu.cost)::decimal(10,6) as avg_cost_per_action,
        MIN(aa.timestamp) as first_activity,
        MAX(aa.timestamp) as last_activity
      FROM agent_activities aa
      LEFT JOIN token_usage tu ON tu.agent_id = aa.agent_id
        AND DATE(tu.created_at) = DATE(aa.timestamp)
      WHERE aa.agent_id = $1
        ${timeFilter ? `AND aa.timestamp >= ${timeFilter}` : ''}
      GROUP BY aa.agent_id
    `;

    const result = await pool.query(query, [agentId]);
    const metrics = result.rows[0] || {
      projects_worked: 0,
      total_actions: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost: 0,
      avg_cost_per_action: 0,
      first_activity: null,
      last_activity: null
    };

    await cache.set(cacheKey, metrics, TTL.MEDIUM);
    return metrics;
  }

  /**
   * Get project-specific analytics
   * @param {number} projectId - Project ID
   * @param {string} period - Time period
   * @returns {Promise<object>} Project analytics
   */
  async getProjectAnalytics(projectId, period = 'all') {
    const timeFilter = this._getTimeFilter(period);
    const cacheKey = CACHE_KEYS.CACHE(
      `project-analytics:${projectId}:${period}`
    );

    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const query = `
      SELECT
        p.id,
        p.name,
        p.created_at,
        COUNT(DISTINCT c.id) as total_conversations,
        COUNT(DISTINCT m.id) as total_messages,
        COUNT(DISTINCT s.id) as total_sources,
        COALESCE(SUM(tu.input_tokens), 0)::bigint as total_input_tokens,
        COALESCE(SUM(tu.output_tokens), 0)::bigint as total_output_tokens,
        COALESCE(SUM(tu.cost), 0)::decimal(10,6) as total_cost,
        COUNT(DISTINCT tu.model) as models_used,
        COUNT(DISTINCT aa.agent_id) as agents_used,
        MAX(c.updated_at) as last_activity
      FROM projects p
      LEFT JOIN conversations c ON c.project_id = p.id
        ${timeFilter ? `AND c.created_at >= ${timeFilter}` : ''}
      LEFT JOIN messages m ON m.conversation_id = c.id
      LEFT JOIN sources s ON s.project_id = p.id
      LEFT JOIN token_usage tu ON tu.conversation_id = c.id
      LEFT JOIN agent_activities aa ON aa.project_id = p.id
        ${timeFilter ? `AND aa.timestamp >= ${timeFilter}` : ''}
      WHERE p.id = $1
      GROUP BY p.id
    `;

    const result = await pool.query(query, [projectId]);
    const analytics = result.rows[0] || null;

    if (analytics) {
      await cache.set(cacheKey, analytics, TTL.SHORT);
    }

    return analytics;
  }

  /**
   * Track token usage
   * @param {number} projectId - Project ID
   * @param {number} conversationId - Conversation ID
   * @param {string} agentId - Agent ID
   * @param {string} model - Model identifier
   * @param {number} inputTokens - Input tokens used
   * @param {number} outputTokens - Output tokens used
   * @returns {Promise<object>} Tracking result
   */
  async trackTokenUsage(
    projectId,
    conversationId,
    agentId,
    model,
    inputTokens,
    outputTokens
  ) {
    try {
      // Calculate cost
      const cost = calculateCost(model, inputTokens, outputTokens);

      // Insert into database
      const query = `
        INSERT INTO token_usage (
          conversation_id,
          project_id,
          agent_id,
          model,
          input_tokens,
          output_tokens,
          total_tokens,
          cost,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `;

      const result = await pool.query(query, [
        conversationId,
        projectId,
        agentId,
        model,
        inputTokens,
        outputTokens,
        inputTokens + outputTokens,
        cost
      ]);

      // Invalidate relevant caches
      await this._invalidateCaches(projectId, agentId);

      return {
        success: true,
        tracking: result.rows[0]
      };
    } catch (error) {
      logger.error('❌ Failed to track token usage:', error);
      throw error;
    }
  }

  /**
   * Refresh analytics materialized views
   * @returns {Promise<boolean>} Success status
   */
  async refreshAnalyticsViews() {
    try {
      // This would refresh materialized views if we have them
      // For now, we'll just clear the cache
      await cache.clearByPattern('zekka:cache:*analytics*');
      await cache.clearByPattern('zekka:cache:*metrics*');
      await cache.clearByPattern('zekka:cache:*costs*');

      return true;
    } catch (error) {
      logger.error('❌ Failed to refresh analytics views:', error);
      return false;
    }
  }

  /**
   * Get time filter for SQL queries
   * @private
   */
  _getTimeFilter(period) {
    switch (period) {
    case 'day':
      return 'NOW() - INTERVAL \'1 day\'';
    case 'week':
      return 'NOW() - INTERVAL \'7 days\'';
    case 'month':
      return 'NOW() - INTERVAL \'30 days\'';
    case 'year':
      return 'NOW() - INTERVAL \'365 days\'';
    case 'all':
    default:
      return null;
    }
  }

  /**
   * Invalidate relevant caches
   * @private
   */
  async _invalidateCaches(projectId, agentId) {
    const patterns = [
      'zekka:cache:metrics:*',
      'zekka:cache:costs:*',
      `zekka:cache:project-analytics:${projectId}:*`,
      agentId ? `zekka:cache:agent-metrics:${agentId}:*` : null
    ].filter(Boolean);

    for (const pattern of patterns) {
      await cache.clearByPattern(pattern);
    }
  }
}

// Singleton instance
let analyticsServiceInstance = null;

/**
 * Get analytics service instance
 */
function getAnalyticsService() {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService();
  }
  return analyticsServiceInstance;
}

module.exports = {
  AnalyticsService,
  getAnalyticsService
};
