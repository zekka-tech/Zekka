/**
 * Agent Service
 *
 * Manages AI agents, their status, tasks, and activity tracking
 * Provides real-time status updates via Redis cache
 */

const { pool } = require('../config/database');
const { cache, CACHE_KEYS, TTL } = require('../config/redis');

/**
 * Agent definitions with capabilities
 */
const AGENT_DEFINITIONS = {
  'pydantic-ai': {
    name: 'Pydantic AI',
    tier: 1,
    description: 'Senior Agent for planning, research, and high-level implementation',
    capabilities: ['planning', 'research', 'architecture', 'code-review']
  },
  'astron-agent': {
    name: 'Astron Agent',
    tier: 1,
    description: 'Plans, researches, tests, and coordinates complex workflows',
    capabilities: ['planning', 'research', 'testing', 'coordination']
  },
  'agent-zero': {
    name: 'Agent Zero',
    tier: 1,
    description: 'Meta-agent for team coordination and context management',
    capabilities: ['coordination', 'context-management', 'orchestration']
  },
  'auto-agent': {
    name: 'AutoAgent',
    tier: 2,
    description: 'Mid-junior level code implementation',
    capabilities: ['coding', 'implementation', 'debugging']
  },
  'softgen-ai': {
    name: 'Softgen AI',
    tier: 2,
    description: 'First phase development execution',
    capabilities: ['frontend', 'ui-development', 'prototyping']
  },
  'bolt-diy': {
    name: 'Bolt.diy',
    tier: 2,
    description: 'First phase development and iteration',
    capabilities: ['rapid-prototyping', 'iteration', 'debugging']
  },
  'augment-code': {
    name: 'AugmentCode',
    tier: 2,
    description: 'Second phase development execution',
    capabilities: ['backend', 'api-development', 'database']
  },
  'warp-dev': {
    name: 'Warp.dev',
    tier: 2,
    description: 'Second phase development and refinement',
    capabilities: ['optimization', 'refactoring', 'performance']
  },
  'windsurf': {
    name: 'Windsurf',
    tier: 2,
    description: 'Second phase development completion',
    capabilities: ['integration', 'testing', 'deployment']
  },
  'coderabbit': {
    name: 'CodeRabbit',
    tier: 3,
    description: 'Code review and quality analysis',
    capabilities: ['code-review', 'quality-analysis', 'best-practices']
  },
  'deepcode': {
    name: 'DeepCode',
    tier: 3,
    description: 'AI-powered bug detection',
    capabilities: ['bug-detection', 'security-analysis', 'vulnerability-scanning']
  },
  'devin': {
    name: 'Devin',
    tier: 3,
    description: 'Advanced autonomous coding tasks',
    capabilities: ['autonomous-coding', 'complex-problem-solving', 'architecture']
  },
  'mintlify': {
    name: 'Mintlify',
    tier: 4,
    description: 'Documentation generation',
    capabilities: ['documentation', 'api-docs', 'markdown']
  },
  'bytebot': {
    name: 'Bytebot',
    tier: 4,
    description: 'Client operations and automation',
    capabilities: ['automation', 'client-support', 'operations']
  }
};

class AgentService {
  /**
   * List all available agents with their current status
   * @returns {Promise<Array>} Array of agents with status
   */
  async listAgents() {
    const agents = [];

    for (const [agentId, definition] of Object.entries(AGENT_DEFINITIONS)) {
      const status = await this.getAgentStatus(agentId);

      agents.push({
        agentId,
        ...definition,
        status: status || 'idle',
        lastActivity: await this._getLastActivity(agentId)
      });
    }

    return agents;
  }

  /**
   * Get agent details
   * @param {string} agentId - Agent identifier
   * @returns {Promise<object|null>} Agent details
   */
  async getAgent(agentId) {
    const definition = AGENT_DEFINITIONS[agentId];
    if (!definition) {
      return null;
    }

    const status = await this.getAgentStatus(agentId);
    const lastActivity = await this._getLastActivity(agentId);
    const metrics = await this._getAgentMetricsQuick(agentId);

    return {
      agentId,
      ...definition,
      status: status || 'idle',
      lastActivity,
      metrics
    };
  }

  /**
   * Get agent status from Redis cache
   * @param {string} agentId - Agent identifier
   * @returns {Promise<string|null>} Agent status
   */
  async getAgentStatus(agentId) {
    const statusKey = CACHE_KEYS.AGENT_STATUS(agentId);
    const status = await cache.get(statusKey, false);
    return status || 'idle';
  }

  /**
   * Get agent activity log
   * @param {string} agentId - Agent identifier
   * @param {number} limit - Number of activities to return
   * @returns {Promise<Array>} Activity log
   */
  async getAgentActivity(agentId, limit = 50) {
    const query = `
      SELECT
        aa.id,
        aa.agent_id,
        aa.project_id,
        aa.action,
        aa.metadata,
        aa.timestamp,
        p.name as project_name
      FROM agent_activities aa
      LEFT JOIN projects p ON p.id = aa.project_id
      WHERE aa.agent_id = $1
      ORDER BY aa.timestamp DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [agentId, limit]);
    return result.rows;
  }

  /**
   * Update agent status
   * @param {string} agentId - Agent identifier
   * @param {string} newStatus - New status ('idle', 'busy', 'error', 'offline')
   * @param {object} metadata - Optional metadata
   * @returns {Promise<object>} Update result
   */
  async updateAgentStatus(agentId, newStatus, metadata = {}) {
    const statusKey = CACHE_KEYS.AGENT_STATUS(agentId);

    // Validate status
    const validStatuses = ['idle', 'busy', 'working', 'error', 'offline', 'paused'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Update cache with TTL
    const statusData = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      ...metadata
    };

    await cache.set(statusKey, JSON.stringify(statusData), TTL.MEDIUM);

    // Log activity
    await this.logActivity(agentId, 'status_changed', {
      oldStatus: await this.getAgentStatus(agentId),
      newStatus,
      ...metadata
    });

    return {
      success: true,
      agentId,
      status: newStatus,
      updatedAt: statusData.updatedAt
    };
  }

  /**
   * Create a task for an agent
   * @param {string} agentId - Agent identifier
   * @param {number} projectId - Project ID
   * @param {object} taskData - Task data
   * @returns {Promise<object>} Created task
   */
  async createTask(agentId, projectId, taskData) {
    const { description, priority = 'medium', metadata = {} } = taskData;

    const query = `
      INSERT INTO agent_tasks (
        agent_id,
        project_id,
        description,
        priority,
        status,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [
      agentId,
      projectId,
      description,
      priority,
      JSON.stringify(metadata)
    ]);

    const task = result.rows[0];

    // Log activity
    await this.logActivity(agentId, 'task_created', {
      taskId: task.id,
      projectId,
      description
    });

    return task;
  }

  /**
   * Update task status
   * @param {number} taskId - Task ID
   * @param {string} status - New status
   * @param {object} metadata - Optional metadata
   * @returns {Promise<object>} Updated task
   */
  async updateTaskStatus(taskId, status, metadata = {}) {
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid task status: ${status}`);
    }

    const query = `
      UPDATE agent_tasks
      SET
        status = $1,
        metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
        updated_at = NOW(),
        ${status === 'completed' ? 'completed_at = NOW()' : ''}
        ${status === 'failed' ? 'failed_at = NOW()' : ''}
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [
      status,
      JSON.stringify(metadata),
      taskId
    ]);

    if (result.rows.length === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const task = result.rows[0];

    // Log activity
    await this.logActivity(task.agent_id, 'task_updated', {
      taskId,
      status,
      ...metadata
    });

    // Update agent status if task completed
    if (status === 'completed' || status === 'failed') {
      await this.updateAgentStatus(task.agent_id, 'idle', {
        lastTask: taskId,
        lastTaskStatus: status
      });
    }

    return task;
  }

  /**
   * Get agent metrics
   * @param {string} agentId - Agent identifier
   * @param {string} period - Time period ('day', 'week', 'month', 'all')
   * @returns {Promise<object>} Agent metrics
   */
  async getAgentMetrics(agentId, period = 'month') {
    const timeFilter = this._getTimeFilter(period);

    const query = `
      SELECT
        COUNT(DISTINCT aa.project_id) as projects_worked,
        COUNT(*) as total_actions,
        COUNT(CASE WHEN at.status = 'completed' THEN 1 END) as tasks_completed,
        COUNT(CASE WHEN at.status = 'failed' THEN 1 END) as tasks_failed,
        COUNT(CASE WHEN at.status = 'pending' THEN 1 END) as tasks_pending,
        MIN(aa.timestamp) as first_activity,
        MAX(aa.timestamp) as last_activity
      FROM agent_activities aa
      LEFT JOIN agent_tasks at ON at.agent_id = aa.agent_id
      WHERE aa.agent_id = $1
        ${timeFilter ? `AND aa.timestamp >= ${timeFilter}` : ''}
      GROUP BY aa.agent_id
    `;

    const result = await pool.query(query, [agentId]);
    return result.rows[0] || {
      projects_worked: 0,
      total_actions: 0,
      tasks_completed: 0,
      tasks_failed: 0,
      tasks_pending: 0,
      first_activity: null,
      last_activity: null
    };
  }

  /**
   * Log agent activity
   * @param {string} agentId - Agent identifier
   * @param {string} action - Action performed
   * @param {object} metadata - Action metadata
   * @param {number} projectId - Optional project ID
   * @returns {Promise<object>} Logged activity
   */
  async logActivity(agentId, action, metadata = {}, projectId = null) {
    const query = `
      INSERT INTO agent_activities (
        agent_id,
        project_id,
        action,
        metadata,
        timestamp
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [
      agentId,
      projectId,
      action,
      JSON.stringify(metadata)
    ]);

    return result.rows[0];
  }

  /**
   * Get last activity for an agent
   * @private
   */
  async _getLastActivity(agentId) {
    const query = `
      SELECT timestamp
      FROM agent_activities
      WHERE agent_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [agentId]);
    return result.rows[0]?.timestamp || null;
  }

  /**
   * Get quick metrics for an agent
   * @private
   */
  async _getAgentMetricsQuick(agentId) {
    const query = `
      SELECT
        COUNT(DISTINCT project_id) as projects,
        COUNT(*) as actions
      FROM agent_activities
      WHERE agent_id = $1
        AND timestamp >= NOW() - INTERVAL '7 days'
    `;

    const result = await pool.query(query, [agentId]);
    return result.rows[0] || { projects: 0, actions: 0 };
  }

  /**
   * Get time filter for SQL queries
   * @private
   */
  _getTimeFilter(period) {
    switch (period) {
      case 'day':
        return "NOW() - INTERVAL '1 day'";
      case 'week':
        return "NOW() - INTERVAL '7 days'";
      case 'month':
        return "NOW() - INTERVAL '30 days'";
      case 'year':
        return "NOW() - INTERVAL '365 days'";
      case 'all':
      default:
        return null;
    }
  }
}

// Singleton instance
let agentServiceInstance = null;

/**
 * Get agent service instance
 */
function getAgentService() {
  if (!agentServiceInstance) {
    agentServiceInstance = new AgentService();
  }
  return agentServiceInstance;
}

module.exports = {
  AgentService,
  getAgentService,
  AGENT_DEFINITIONS
};
