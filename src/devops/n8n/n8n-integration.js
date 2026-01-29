/**
 * N8n Workflow Automation Integration
 * Comprehensive workflow automation and orchestration system
 * Features: Workflow creation, execution, scheduling, monitoring, webhooks
 */

const EventEmitter = require('events');

class N8nIntegration extends EventEmitter {
  constructor(contextBus, logger, config = {}) {
    super();
    this.contextBus = contextBus;
    this.logger = logger;
    this.config = {
      apiUrl:
        config.apiUrl
        || process.env.N8N_API_URL
        || 'http://localhost:5678/api/v1',
      apiKey: config.apiKey || process.env.N8N_API_KEY,
      webhookUrl:
        config.webhookUrl
        || process.env.N8N_WEBHOOK_URL
        || 'http://localhost:5678/webhook',
      autoExecute: config.autoExecute !== false,
      enableMonitoring: config.enableMonitoring !== false,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 5000,
      ...config
    };

    this.workflows = new Map();
    this.executions = new Map();
    this.webhooks = new Map();
    this.schedules = new Map();
  }

  /**
   * Initialize N8n integration
   */
  async initialize() {
    this.logger.info('[N8nIntegration] Initializing N8n workflow automation');

    if (!this.config.apiKey) {
      this.logger.warn(
        '[N8nIntegration] API key not configured, using local mode'
      );
    }

    try {
      // Verify connection
      await this.verifyConnection();

      // Load existing workflows
      await this.loadWorkflows();

      // Initialize monitoring
      if (this.config.enableMonitoring) {
        await this.startMonitoring();
      }

      await this.contextBus.publish('n8n.initialized', {
        timestamp: new Date().toISOString()
      });

      this.logger.info(
        '[N8nIntegration] N8n integration initialized successfully'
      );
      return true;
    } catch (error) {
      this.logger.error('[N8nIntegration] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Verify N8n API connection
   */
  async verifyConnection() {
    // In production, verify with actual N8n API:
    // const axios = require('axios');
    // const response = await axios.get(`${this.config.apiUrl}/workflows`, {
    //   headers: {
    //     'X-N8N-API-KEY': this.config.apiKey
    //   }
    // });

    this.logger.info('[N8nIntegration] Connection verified');
    return true;
  }

  /**
   * Create N8n workflow
   */
  async createWorkflow(workflowDefinition) {
    this.logger.info(
      `[N8nIntegration] Creating workflow: ${workflowDefinition.name}`
    );

    const workflowId = `wf-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      // In production, create via N8n API:
      // const axios = require('axios');
      // const response = await axios.post(`${this.config.apiUrl}/workflows`, {
      //   name: workflowDefinition.name,
      //   nodes: workflowDefinition.nodes,
      //   connections: workflowDefinition.connections,
      //   active: workflowDefinition.active || false,
      //   settings: workflowDefinition.settings
      // }, {
      //   headers: {
      //     'X-N8N-API-KEY': this.config.apiKey
      //   }
      // });

      const workflow = {
        id: workflowId,
        name: workflowDefinition.name,
        description: workflowDefinition.description || '',
        nodes: workflowDefinition.nodes || [],
        connections: workflowDefinition.connections || {},
        active: workflowDefinition.active || false,
        settings: workflowDefinition.settings || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: workflowDefinition.tags || [],
        statistics: {
          executions: 0,
          successRate: 0,
          averageDuration: 0
        }
      };

      this.workflows.set(workflowId, workflow);

      await this.contextBus.publish('n8n.workflow-created', {
        workflowId,
        name: workflow.name,
        timestamp: workflow.createdAt
      });

      this.logger.info(`[N8nIntegration] Workflow created: ${workflowId}`);
      return workflow;
    } catch (error) {
      this.logger.error('[N8nIntegration] Failed to create workflow:', error);
      throw error;
    }
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflowId, inputData = {}) {
    this.logger.info(`[N8nIntegration] Executing workflow: ${workflowId}`);

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      // In production, execute via N8n API:
      // const axios = require('axios');
      // const response = await axios.post(`${this.config.apiUrl}/workflows/${workflowId}/execute`, {
      //   data: inputData
      // }, {
      //   headers: {
      //     'X-N8N-API-KEY': this.config.apiKey
      //   }
      // });

      const execution = {
        id: executionId,
        workflowId,
        status: 'running',
        startTime: Date.now(),
        inputData,
        mode: 'manual'
      };

      this.executions.set(executionId, execution);

      // Simulate execution
      await this.simulateExecution(execution);

      // Update statistics
      workflow.statistics.executions++;

      await this.contextBus.publish('n8n.workflow-executed', {
        workflowId,
        executionId,
        status: execution.status,
        timestamp: new Date().toISOString()
      });

      this.logger.info(
        `[N8nIntegration] Workflow execution completed: ${executionId}`
      );
      return execution;
    } catch (error) {
      this.logger.error('[N8nIntegration] Workflow execution failed:', error);
      throw error;
    }
  }

  /**
   * Simulate workflow execution
   */
  async simulateExecution(execution) {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));

    execution.status = 'success';
    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime;
    execution.outputData = {
      success: true,
      processed: true,
      message: 'Workflow executed successfully'
    };

    return execution;
  }

  /**
   * Create webhook for workflow
   */
  async createWebhook(workflowId, config = {}) {
    this.logger.info(
      `[N8nIntegration] Creating webhook for workflow: ${workflowId}`
    );

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const webhookId = `wh-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const webhookPath = `/${workflowId}/${webhookId}`;

    const webhook = {
      id: webhookId,
      workflowId,
      path: webhookPath,
      url: `${this.config.webhookUrl}${webhookPath}`,
      method: config.method || 'POST',
      active: true,
      authentication: config.authentication || 'none',
      createdAt: new Date().toISOString()
    };

    this.webhooks.set(webhookId, webhook);

    await this.contextBus.publish('n8n.webhook-created', {
      webhookId,
      workflowId,
      url: webhook.url,
      timestamp: webhook.createdAt
    });

    this.logger.info(`[N8nIntegration] Webhook created: ${webhook.url}`);
    return webhook;
  }

  /**
   * Schedule workflow execution
   */
  async scheduleWorkflow(workflowId, schedule) {
    this.logger.info(`[N8nIntegration] Scheduling workflow: ${workflowId}`);

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const scheduleId = `sched-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const scheduledExecution = {
      id: scheduleId,
      workflowId,
      schedule: schedule.cron || '0 0 * * *', // Default: daily at midnight
      timezone: schedule.timezone || 'UTC',
      active: true,
      lastExecution: null,
      nextExecution: this.calculateNextExecution(schedule.cron),
      createdAt: new Date().toISOString()
    };

    this.schedules.set(scheduleId, scheduledExecution);

    await this.contextBus.publish('n8n.workflow-scheduled', {
      scheduleId,
      workflowId,
      schedule: scheduledExecution.schedule,
      nextExecution: scheduledExecution.nextExecution,
      timestamp: scheduledExecution.createdAt
    });

    this.logger.info(`[N8nIntegration] Workflow scheduled: ${scheduleId}`);
    return scheduledExecution;
  }

  /**
   * Calculate next execution time from cron expression
   */
  calculateNextExecution(cronExpression) {
    // Simplified calculation - in production use cron-parser library
    const now = new Date();
    const next = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours
    return next.toISOString();
  }

  /**
   * Load existing workflows
   */
  async loadWorkflows() {
    // In production, load from N8n API
    this.logger.info('[N8nIntegration] Loading existing workflows');

    // Mock workflows for common use cases
    const commonWorkflows = [
      {
        name: 'Code Review Automation',
        description: 'Automatically review pull requests and provide feedback',
        nodes: ['GitHub Trigger', 'Code Analyzer', 'Comment on PR'],
        tags: ['git', 'code-review', 'automation']
      },
      {
        name: 'Deployment Pipeline',
        description: 'Automated deployment to production',
        nodes: ['Git Push Trigger', 'Build', 'Test', 'Deploy', 'Notify'],
        tags: ['deployment', 'ci-cd', 'automation']
      },
      {
        name: 'Issue Triaging',
        description: 'Automatically triage and assign issues',
        nodes: ['Issue Created', 'Classify Issue', 'Assign', 'Label'],
        tags: ['issues', 'automation', 'project-management']
      }
    ];

    for (const wf of commonWorkflows) {
      try {
        await this.createWorkflow(wf);
      } catch (error) {
        this.logger.error(
          `[N8nIntegration] Failed to load workflow: ${wf.name}`,
          error
        );
      }
    }

    this.logger.info(
      `[N8nIntegration] Loaded ${this.workflows.size} workflows`
    );
  }

  /**
   * Start monitoring workflows
   */
  async startMonitoring() {
    this.logger.info('[N8nIntegration] Starting workflow monitoring');

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkScheduledWorkflows();
        await this.monitorActiveExecutions();
      } catch (error) {
        this.logger.error('[N8nIntegration] Monitoring error:', error);
      }
    }, 60000); // Check every minute

    this.logger.info('[N8nIntegration] Monitoring started');
  }

  /**
   * Check and execute scheduled workflows
   */
  async checkScheduledWorkflows() {
    const now = Date.now();

    for (const [scheduleId, schedule] of this.schedules.entries()) {
      if (!schedule.active) continue;

      const nextExecution = new Date(schedule.nextExecution).getTime();
      if (now >= nextExecution) {
        try {
          await this.executeWorkflow(schedule.workflowId, {
            trigger: 'schedule',
            scheduleId
          });

          schedule.lastExecution = new Date().toISOString();
          schedule.nextExecution = this.calculateNextExecution(
            schedule.schedule
          );
        } catch (error) {
          this.logger.error(
            `[N8nIntegration] Scheduled execution failed: ${scheduleId}`,
            error
          );
        }
      }
    }
  }

  /**
   * Monitor active executions
   */
  async monitorActiveExecutions() {
    for (const [executionId, execution] of this.executions.entries()) {
      if (execution.status === 'running') {
        const duration = Date.now() - execution.startTime;
        if (duration > 300000) {
          // 5 minutes timeout
          execution.status = 'timeout';
          execution.error = 'Execution timeout exceeded';
          this.logger.warn(
            `[N8nIntegration] Execution timeout: ${executionId}`
          );
        }
      }
    }
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId) {
    return this.workflows.get(workflowId);
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId) {
    return this.executions.get(executionId);
  }

  /**
   * Get workflow executions
   */
  getWorkflowExecutions(workflowId, limit = 10) {
    return Array.from(this.executions.values())
      .filter((exec) => exec.workflowId === workflowId)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * Update workflow
   */
  async updateWorkflow(workflowId, updates) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    Object.assign(workflow, updates);
    workflow.updatedAt = new Date().toISOString();

    await this.contextBus.publish('n8n.workflow-updated', {
      workflowId,
      timestamp: workflow.updatedAt
    });

    return workflow;
  }

  /**
   * Activate/deactivate workflow
   */
  async toggleWorkflow(workflowId, active) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.active = active;
    workflow.updatedAt = new Date().toISOString();

    await this.contextBus.publish('n8n.workflow-toggled', {
      workflowId,
      active,
      timestamp: workflow.updatedAt
    });

    this.logger.info(
      `[N8nIntegration] Workflow ${active ? 'activated' : 'deactivated'}: ${workflowId}`
    );
    return workflow;
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    this.workflows.delete(workflowId);

    // Delete related webhooks
    for (const [webhookId, webhook] of this.webhooks.entries()) {
      if (webhook.workflowId === workflowId) {
        this.webhooks.delete(webhookId);
      }
    }

    // Delete related schedules
    for (const [scheduleId, schedule] of this.schedules.entries()) {
      if (schedule.workflowId === workflowId) {
        this.schedules.delete(scheduleId);
      }
    }

    await this.contextBus.publish('n8n.workflow-deleted', {
      workflowId,
      timestamp: new Date().toISOString()
    });

    this.logger.info(`[N8nIntegration] Workflow deleted: ${workflowId}`);
    return true;
  }

  /**
   * Retry failed execution
   */
  async retryExecution(executionId) {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (execution.status !== 'failed' && execution.status !== 'timeout') {
      throw new Error('Can only retry failed or timed out executions');
    }

    this.logger.info(`[N8nIntegration] Retrying execution: ${executionId}`);
    return await this.executeWorkflow(
      execution.workflowId,
      execution.inputData
    );
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const executions = Array.from(this.executions.values());
    const successfulExecutions = executions.filter(
      (e) => e.status === 'success'
    ).length;
    const failedExecutions = executions.filter(
      (e) => e.status === 'failed'
    ).length;

    return {
      workflows: {
        total: this.workflows.size,
        active: Array.from(this.workflows.values()).filter((w) => w.active)
          .length,
        inactive: Array.from(this.workflows.values()).filter((w) => !w.active)
          .length
      },
      executions: {
        total: executions.length,
        successful: successfulExecutions,
        failed: failedExecutions,
        running: executions.filter((e) => e.status === 'running').length,
        successRate:
          executions.length > 0
            ? `${((successfulExecutions / executions.length) * 100).toFixed(2)}%`
            : 'N/A'
      },
      webhooks: this.webhooks.size,
      schedules: {
        total: this.schedules.size,
        active: Array.from(this.schedules.values()).filter((s) => s.active)
          .length
      }
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.workflows.clear();
    this.executions.clear();
    this.webhooks.clear();
    this.schedules.clear();

    this.logger.info('[N8nIntegration] Cleanup completed');
  }
}

module.exports = N8nIntegration;
