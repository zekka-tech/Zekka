/**
 * Agent Zero - Base Agent Class
 * Foundation for all Agent Zero roles with shared capabilities
 */

const EventEmitter = require('events');

class BaseAgentZero extends EventEmitter {
  constructor(role, contextBus, logger, config = {}) {
    super();
    this.role = role;
    this.contextBus = contextBus;
    this.logger = logger;
    this.config = config;
    this.agentId = `agent-zero-${role}-${Date.now()}`;
    this.state = 'idle'; // idle, active, paused, error
    this.metrics = {
      tasksCompleted: 0,
      tasksFailed: 0,
      averageExecutionTime: 0,
      lastActivity: null
    };
  }

  /**
   * Initialize agent with context
   */
  async initialize(projectId, context = {}) {
    this.logger.info(
      `[${this.role}] Initializing agent ${this.agentId} for project ${projectId}`
    );
    this.projectId = projectId;
    this.context = context;
    this.state = 'active';

    // Register with context bus
    await this.contextBus.publish(`agent.${this.role}.initialized`, {
      agentId: this.agentId,
      projectId: this.projectId,
      role: this.role,
      timestamp: new Date().toISOString()
    });

    return this;
  }

  /**
   * Execute agent task
   */
  async execute(task) {
    const startTime = Date.now();
    try {
      this.logger.info(`[${this.role}] Executing task: ${task.name}`);
      this.state = 'active';

      // Validate task
      this.validateTask(task);

      // Execute role-specific logic
      const result = await this.executeTask(task);

      // Update metrics
      const executionTime = Date.now() - startTime;
      this.updateMetrics(true, executionTime);

      // Publish result to context bus
      await this.contextBus.publish(`agent.${this.role}.completed`, {
        agentId: this.agentId,
        projectId: this.projectId,
        task: task.name,
        result,
        executionTime,
        timestamp: new Date().toISOString()
      });

      this.emit('taskCompleted', { task, result });
      return result;
    } catch (error) {
      this.logger.error(`[${this.role}] Task execution failed:`, error);
      this.state = 'error';
      this.updateMetrics(false);

      await this.contextBus.publish(`agent.${this.role}.error`, {
        agentId: this.agentId,
        projectId: this.projectId,
        task: task.name,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Validate task structure
   */
  validateTask(task) {
    if (!task || typeof task !== 'object') {
      throw new Error('Invalid task: must be an object');
    }
    if (!task.name) {
      throw new Error('Invalid task: missing name');
    }
    if (!task.type) {
      throw new Error('Invalid task: missing type');
    }
  }

  /**
   * Execute role-specific task (to be implemented by subclasses)
   */
  async executeTask(task) {
    throw new Error('executeTask must be implemented by subclass');
  }

  /**
   * Update agent metrics
   */
  updateMetrics(success, executionTime = 0) {
    if (success) {
      this.metrics.tasksCompleted++;
      // Update average execution time
      const totalTasks = this.metrics.tasksCompleted;
      this.metrics.averageExecutionTime = (this.metrics.averageExecutionTime * (totalTasks - 1) + executionTime)
        / totalTasks;
    } else {
      this.metrics.tasksFailed++;
    }
    this.metrics.lastActivity = new Date().toISOString();
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      agentId: this.agentId,
      role: this.role,
      state: this.state,
      projectId: this.projectId,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Pause agent execution
   */
  async pause() {
    this.logger.info(`[${this.role}] Pausing agent ${this.agentId}`);
    this.state = 'paused';
    await this.contextBus.publish(`agent.${this.role}.paused`, {
      agentId: this.agentId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Resume agent execution
   */
  async resume() {
    this.logger.info(`[${this.role}] Resuming agent ${this.agentId}`);
    this.state = 'active';
    await this.contextBus.publish(`agent.${this.role}.resumed`, {
      agentId: this.agentId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Shutdown agent
   */
  async shutdown() {
    this.logger.info(`[${this.role}] Shutting down agent ${this.agentId}`);
    this.state = 'idle';
    await this.contextBus.publish(`agent.${this.role}.shutdown`, {
      agentId: this.agentId,
      timestamp: new Date().toISOString()
    });
    this.removeAllListeners();
  }

  /**
   * Learn from feedback (adaptive learning)
   */
  async learn(feedback) {
    this.logger.info(`[${this.role}] Learning from feedback`);

    // Store feedback in context
    await this.contextBus.set(
      `agent:${this.agentId}:feedback:${Date.now()}`,
      JSON.stringify(feedback),
      300 // 5 minutes TTL
    );

    this.emit('learned', feedback);
  }

  /**
   * Collaborate with other agents
   */
  async collaborate(targetRole, message) {
    this.logger.info(`[${this.role}] Collaborating with ${targetRole}`);

    await this.contextBus.publish(`agent.${targetRole}.message`, {
      from: this.agentId,
      fromRole: this.role,
      message,
      projectId: this.projectId,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = BaseAgentZero;
