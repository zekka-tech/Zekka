/**
 * Orchestrator Service
 * Business logic for multi-agent orchestration
 *
 * Features:
 * - Agent coordination
 * - Task management
 * - Budget control
 * - Performance monitoring
 * - Error recovery
 */

const { AppError, ErrorCodes } = require('../utils/errors');
const { AuditLogger } = require('../utils/audit-logger');
const { CircuitBreaker } = require('../utils/circuit-breaker');

class OrchestratorService {
  constructor(orchestrator, config) {
    this.orchestrator = orchestrator;
    this.config = config;
    this.auditLogger = new AuditLogger();

    // Circuit breaker for agent operations
    this.agentCircuitBreaker = new CircuitBreaker({
      name: 'agent-operations',
      failureThreshold: 5,
      resetTimeout: 60000,
      monitor: true
    });
  }

  /**
   * Execute a task with multi-agent orchestration
   * @param {Object} taskData - Task configuration
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Task execution result
   */
  async executeTask(taskData, userId) {
    const startTime = Date.now();

    try {
      const {
        description, context = {}, options = {}, budget = {}
      } = taskData;

      // Validate input
      if (!description || !description.trim()) {
        throw new AppError(
          'Task description is required',
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Log task start
      await this.auditLogger.log({
        category: 'orchestration',
        action: 'task_started',
        userId,
        details: {
          description: description.substring(0, 100),
          budget,
          options
        },
        severity: 'info'
      });

      // Execute task with circuit breaker protection
      const result = await this.agentCircuitBreaker.execute(
        async () => await this.orchestrator.executeTask({
          description,
          context,
          options: {
            maxAgents: options.maxAgents || this.config.maxConcurrentAgents,
            timeout: options.timeout || 300000, // 5 minutes default
            budget: {
              daily: budget.daily || this.config.dailyBudget,
              monthly: budget.monthly || this.config.monthlyBudget
            }
          }
        })
      );

      const duration = Date.now() - startTime;

      // Log successful completion
      await this.auditLogger.log({
        category: 'orchestration',
        action: 'task_completed',
        userId,
        details: {
          description: description.substring(0, 100),
          duration,
          agentsUsed: result.agentsUsed,
          tokensUsed: result.tokensUsed
        },
        severity: 'info'
      });

      return {
        success: true,
        result,
        metrics: {
          duration,
          agentsUsed: result.agentsUsed,
          tokensUsed: result.tokensUsed
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failure
      await this.auditLogger.log({
        category: 'orchestration',
        action: 'task_failed',
        userId,
        details: {
          description: taskData.description?.substring(0, 100),
          duration,
          error: error.message
        },
        severity: 'error'
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'Task execution failed',
        500,
        ErrorCodes.ORCHESTRATION_ERROR,
        { originalError: error.message }
      );
    }
  }

  /**
   * Get agent status
   * @returns {Promise<Object>} Agent status information
   */
  async getAgentStatus() {
    try {
      const status = await this.orchestrator.getStatus();

      return {
        activeAgents: status.activeAgents || 0,
        availableAgents: status.availableAgents || 50,
        queuedTasks: status.queuedTasks || 0,
        tokensUsed: {
          daily: status.tokensUsed?.daily || 0,
          monthly: status.tokensUsed?.monthly || 0
        },
        budget: {
          daily: this.config.dailyBudget,
          monthly: this.config.monthlyBudget
        },
        circuitBreaker: {
          state: this.agentCircuitBreaker.state,
          stats: this.agentCircuitBreaker.getStats()
        }
      };
    } catch (error) {
      throw new AppError(
        'Failed to get agent status',
        500,
        ErrorCodes.INTERNAL_ERROR,
        { originalError: error.message }
      );
    }
  }

  /**
   * Cancel a running task
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   */
  async cancelTask(taskId, userId) {
    try {
      await this.orchestrator.cancelTask(taskId);

      await this.auditLogger.log({
        category: 'orchestration',
        action: 'task_cancelled',
        userId,
        details: { taskId },
        severity: 'warning'
      });

      return { message: 'Task cancelled successfully' };
    } catch (error) {
      throw new AppError(
        'Failed to cancel task',
        500,
        ErrorCodes.INTERNAL_ERROR,
        { originalError: error.message }
      );
    }
  }

  /**
   * Get task history
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Task history
   */
  async getTaskHistory(userId, filters = {}) {
    try {
      const {
        limit = 50, offset = 0, status, startDate, endDate
      } = filters;

      // In production, this would query a database
      // For now, return mock data structure
      return {
        tasks: [],
        total: 0,
        limit,
        offset
      };
    } catch (error) {
      throw new AppError(
        'Failed to retrieve task history',
        500,
        ErrorCodes.INTERNAL_ERROR,
        { originalError: error.message }
      );
    }
  }

  /**
   * Get orchestration metrics
   * @returns {Promise<Object>} Orchestration metrics
   */
  async getMetrics() {
    try {
      const status = await this.getAgentStatus();

      return {
        agents: {
          active: status.activeAgents,
          available: status.availableAgents,
          utilization: (
            (status.activeAgents / status.availableAgents)
            * 100
          ).toFixed(2)
        },
        tasks: {
          queued: status.queuedTasks
        },
        tokens: status.tokensUsed,
        budget: status.budget,
        circuitBreaker: status.circuitBreaker
      };
    } catch (error) {
      throw new AppError(
        'Failed to get metrics',
        500,
        ErrorCodes.INTERNAL_ERROR,
        { originalError: error.message }
      );
    }
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   * @param {string} userId - User ID
   */
  async updateConfig(newConfig, userId) {
    try {
      // Validate configuration
      if (newConfig.maxConcurrentAgents && newConfig.maxConcurrentAgents < 1) {
        throw new AppError(
          'maxConcurrentAgents must be at least 1',
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Update configuration
      Object.assign(this.config, newConfig);

      await this.auditLogger.log({
        category: 'orchestration',
        action: 'config_updated',
        userId,
        details: { newConfig },
        severity: 'info'
      });

      return { message: 'Configuration updated successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Failed to update configuration',
        500,
        ErrorCodes.INTERNAL_ERROR,
        { originalError: error.message }
      );
    }
  }

  /**
   * Health check for orchestrator
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const status = await this.getAgentStatus();

      const health = {
        status: 'healthy',
        checks: {
          orchestrator: status.availableAgents > 0,
          circuitBreaker: status.circuitBreaker.state !== 'OPEN',
          budget: status.tokensUsed.daily < status.budget.daily
        }
      };

      health.status = Object.values(health.checks).every((v) => v)
        ? 'healthy'
        : 'degraded';

      return health;
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = { OrchestratorService };
