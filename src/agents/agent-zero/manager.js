/**
 * Agent Zero Manager
 * Coordinates all Agent Zero roles (Teacher, Trainer, Tutor, Optimizer, Mentor, Validator)
 * Orchestrates learning, development, optimization, and validation across the system
 */

const TeacherAgent = require('./teacher');
const TrainerAgent = require('./trainer');
const TutorAgent = require('./tutor');
const OptimizerAgent = require('./optimizer');
const MentorAgent = require('./mentor');
const ValidatorAgent = require('./validator');

class AgentZeroManager {
  constructor(contextBus, logger, config = {}) {
    this.contextBus = contextBus;
    this.logger = logger;
    this.config = config;

    // Initialize all Agent Zero roles
    this.teacher = new TeacherAgent(contextBus, logger, config.teacher || {});
    this.trainer = new TrainerAgent(contextBus, logger, config.trainer || {});
    this.tutor = new TutorAgent(contextBus, logger, config.tutor || {});
    this.optimizer = new OptimizerAgent(
      contextBus,
      logger,
      config.optimizer || {}
    );
    this.mentor = new MentorAgent(contextBus, logger, config.mentor || {});
    this.validator = new ValidatorAgent(
      contextBus,
      logger,
      config.validator || {}
    );

    this.agents = {
      teacher: this.teacher,
      trainer: this.trainer,
      tutor: this.tutor,
      optimizer: this.optimizer,
      mentor: this.mentor,
      validator: this.validator
    };

    this.activeWorkflows = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize Agent Zero system
   */
  async initialize() {
    this.logger.info('[AgentZero] Initializing Agent Zero system...');

    try {
      // Initialize all agents
      for (const [role, agent] of Object.entries(this.agents)) {
        await agent.initialize('agent-zero-system', { role });
        this.logger.info(`[AgentZero] ${role} initialized successfully`);
      }

      // Setup inter-agent communication
      this.setupCommunication();

      // Register event handlers
      this.registerEventHandlers();

      this.isInitialized = true;
      this.logger.info(
        '[AgentZero] Agent Zero system initialized successfully'
      );

      // Publish initialization event
      await this.contextBus.publish('agent-zero.initialized', {
        agents: Object.keys(this.agents),
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      this.logger.error('[AgentZero] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Setup communication between agents
   */
  setupCommunication() {
    // Allow agents to collaborate and share insights
    for (const agent of Object.values(this.agents)) {
      agent.on('taskCompleted', (data) => {
        this.handleAgentTaskCompletion(agent.role, data);
      });

      agent.on('learned', (feedback) => {
        this.shareLearnedKnowledge(agent.role, feedback);
      });
    }
  }

  /**
   * Register event handlers for context bus events
   */
  registerEventHandlers() {
    // Listen for workflow stage events
    this.contextBus.subscribe('workflow.stage.*', async (channel, message) => {
      await this.handleWorkflowEvent(channel, message);
    });

    // Listen for agent events
    this.contextBus.subscribe('agent.*.completed', async (channel, message) => {
      await this.handleAgentEvent(channel, message);
    });
  }

  /**
   * Start comprehensive learning workflow
   */
  async startLearningWorkflow(projectId, agentId, options = {}) {
    this.logger.info(
      `[AgentZero] Starting learning workflow for agent ${agentId} in project ${projectId}`
    );

    const workflow = {
      id: `learning-workflow-${Date.now()}`,
      projectId,
      agentId,
      startTime: new Date().toISOString(),
      status: 'in-progress',
      phases: [],
      results: {}
    };

    try {
      // Phase 1: Assessment (Teacher)
      this.logger.info('[AgentZero] Phase 1: Initial Assessment');
      const assessment = await this.teacher.execute({
        name: 'assess-agent',
        type: 'review',
        projectId
      });
      workflow.phases.push({ phase: 'assessment', result: assessment });

      // Phase 2: Training (Trainer)
      if (options.includeTraining !== false) {
        this.logger.info('[AgentZero] Phase 2: Training');
        const training = await this.trainer.execute({
          name: 'train-agent',
          type: 'train',
          traineeId: agentId,
          skill: options.skill || 'code-analysis'
        });
        workflow.phases.push({ phase: 'training', result: training });
      }

      // Phase 3: Tutoring (Tutor)
      if (options.includeTutoring !== false) {
        this.logger.info('[AgentZero] Phase 3: Personalized Tutoring');
        const tutoring = await this.tutor.execute({
          name: 'tutor-agent',
          type: 'session',
          agentId,
          topic: options.topic || 'best-practices'
        });
        workflow.phases.push({ phase: 'tutoring', result: tutoring });
      }

      // Phase 4: Optimization (Optimizer)
      if (options.includeOptimization !== false) {
        this.logger.info('[AgentZero] Phase 4: Performance Optimization');
        const optimization = await this.optimizer.execute({
          name: 'optimize-agent',
          type: 'optimize',
          targetId: agentId,
          focusAreas: options.focusAreas || ['speed', 'accuracy']
        });
        workflow.phases.push({ phase: 'optimization', result: optimization });
      }

      // Phase 5: Mentoring (Mentor)
      if (options.includeMentoring !== false) {
        this.logger.info('[AgentZero] Phase 5: Career Mentoring');
        const mentoring = await this.mentor.execute({
          name: 'mentor-agent',
          type: 'mentor',
          menteeId: agentId
        });
        workflow.phases.push({ phase: 'mentoring', result: mentoring });
      }

      // Phase 6: Validation (Validator)
      this.logger.info('[AgentZero] Phase 6: Final Validation');
      const validation = await this.validator.execute({
        name: 'validate-agent',
        type: 'quality',
        target: { id: agentId, type: 'agent' }
      });
      workflow.phases.push({ phase: 'validation', result: validation });

      workflow.status = 'completed';
      workflow.endTime = new Date().toISOString();

      // Compile results
      workflow.results = {
        assessment,
        improvement: this.calculateImprovement(workflow.phases),
        readiness: validation.overallScore,
        recommendations: this.compileRecommendations(workflow.phases)
      };

      this.activeWorkflows.set(workflow.id, workflow);

      // Publish completion event
      await this.contextBus.publish('agent-zero.workflow-completed', {
        workflowId: workflow.id,
        projectId,
        agentId,
        results: workflow.results,
        timestamp: new Date().toISOString()
      });

      return workflow;
    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;
      this.logger.error('[AgentZero] Learning workflow failed:', error);
      throw error;
    }
  }

  /**
   * Execute specific Agent Zero role task
   */
  async executeTask(role, task) {
    if (!this.agents[role]) {
      throw new Error(`Unknown Agent Zero role: ${role}`);
    }

    this.logger.info(`[AgentZero] Executing ${role} task: ${task.name}`);

    const agent = this.agents[role];
    return await agent.execute(task);
  }

  /**
   * Get comprehensive status of all agents
   */
  getStatus() {
    const status = {
      initialized: this.isInitialized,
      agents: {},
      activeWorkflows: this.activeWorkflows.size,
      systemHealth: 'healthy'
    };

    for (const [role, agent] of Object.entries(this.agents)) {
      status.agents[role] = agent.getStatus();
    }

    return status;
  }

  /**
   * Get detailed metrics
   */
  async getMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      agents: {},
      workflows: {
        total: this.activeWorkflows.size,
        completed: Array.from(this.activeWorkflows.values()).filter(
          (w) => w.status === 'completed'
        ).length,
        failed: Array.from(this.activeWorkflows.values()).filter(
          (w) => w.status === 'failed'
        ).length
      },
      performance: {}
    };

    // Get metrics from each agent
    for (const [role, agent] of Object.entries(this.agents)) {
      metrics.agents[role] = agent.metrics;
    }

    // Calculate system-wide performance
    const allMetrics = Object.values(metrics.agents);
    metrics.performance = {
      avgExecutionTime:
        allMetrics.reduce((sum, m) => sum + (m.averageExecutionTime || 0), 0)
        / allMetrics.length,
      totalTasksCompleted: allMetrics.reduce(
        (sum, m) => sum + (m.tasksCompleted || 0),
        0
      ),
      totalTasksFailed: allMetrics.reduce(
        (sum, m) => sum + (m.tasksFailed || 0),
        0
      )
    };

    return metrics;
  }

  /**
   * Recommend best Agent Zero role for a task
   */
  recommendRole(taskDescription) {
    const keywords = taskDescription.toLowerCase();

    if (
      keywords.includes('guide')
      || keywords.includes('workflow')
      || keywords.includes('strategy')
    ) {
      return 'teacher';
    }
    if (
      keywords.includes('train')
      || keywords.includes('skill')
      || keywords.includes('practice')
    ) {
      return 'trainer';
    }
    if (
      keywords.includes('question')
      || keywords.includes('help')
      || keywords.includes('explain')
    ) {
      return 'tutor';
    }
    if (
      keywords.includes('optimize')
      || keywords.includes('performance')
      || keywords.includes('improve')
    ) {
      return 'optimizer';
    }
    if (
      keywords.includes('mentor')
      || keywords.includes('career')
      || keywords.includes('growth')
    ) {
      return 'mentor';
    }
    if (
      keywords.includes('validate')
      || keywords.includes('verify')
      || keywords.includes('check')
    ) {
      return 'validator';
    }

    // Default to teacher for general guidance
    return 'teacher';
  }

  /**
   * Helper methods
   */
  async handleAgentTaskCompletion(role, data) {
    this.logger.info(`[AgentZero] ${role} completed task: ${data.task.name}`);

    // Trigger follow-up actions based on role
    if (role === 'validator' && data.result.passed === false) {
      // If validation fails, engage trainer for improvement
      this.logger.info(
        '[AgentZero] Validation failed, engaging trainer for improvement'
      );
    }
  }

  async shareLearnedKnowledge(role, feedback) {
    this.logger.info(
      `[AgentZero] ${role} learned from feedback, sharing with other agents`
    );

    // Broadcast learned knowledge to all agents
    await this.contextBus.publish('agent-zero.knowledge-shared', {
      from: role,
      feedback,
      timestamp: new Date().toISOString()
    });
  }

  async handleWorkflowEvent(channel, message) {
    const msgData = typeof message === 'string' ? JSON.parse(message) : message;
    this.logger.info(`[AgentZero] Workflow event: ${channel}`, msgData);

    // React to workflow events
    if (channel.includes('stage.started')) {
      // Teacher can provide guidance for new stages
      // Optimizer can prepare performance monitoring
    } else if (channel.includes('stage.completed')) {
      // Validator can verify stage outputs
    }
  }

  async handleAgentEvent(channel, message) {
    const msgData = typeof message === 'string' ? JSON.parse(message) : message;
    this.logger.info(`[AgentZero] Agent event: ${channel}`, msgData);
  }

  calculateImprovement(phases) {
    // Simple improvement calculation based on phases
    const improvements = [];

    for (const phase of phases) {
      if (phase.phase === 'training' && phase.result.score) {
        improvements.push({ area: 'skill', value: phase.result.score });
      }
      if (phase.phase === 'optimization' && phase.result.expectedImprovements) {
        improvements.push({
          area: 'performance',
          value: phase.result.expectedImprovements
        });
      }
    }

    return improvements;
  }

  compileRecommendations(phases) {
    const recommendations = [];

    for (const phase of phases) {
      if (phase.result.recommendations) {
        recommendations.push(...phase.result.recommendations);
      }
      if (phase.result.actionableSteps) {
        recommendations.push(...phase.result.actionableSteps);
      }
      if (phase.result.nextSteps) {
        recommendations.push(...phase.result.nextSteps);
      }
    }

    return recommendations.slice(0, 10); // Top 10 recommendations
  }

  /**
   * Shutdown Agent Zero system
   */
  async shutdown() {
    this.logger.info('[AgentZero] Shutting down Agent Zero system...');

    for (const [role, agent] of Object.entries(this.agents)) {
      await agent.shutdown();
      this.logger.info(`[AgentZero] ${role} shut down`);
    }

    this.isInitialized = false;
    this.logger.info('[AgentZero] Agent Zero system shut down successfully');
  }
}

module.exports = AgentZeroManager;
