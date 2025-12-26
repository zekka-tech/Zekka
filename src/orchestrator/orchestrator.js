const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

/**
 * Zekka Orchestrator - Central coordination for multi-agent workflows
 */
class ZekkaOrchestrator {
  constructor(options = {}) {
    this.contextBus = options.contextBus;
    this.tokenEconomics = options.tokenEconomics;
    this.logger = options.logger || console;
    this.config = options.config || {};
    
    this.db = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || 'zekka',
      user: process.env.POSTGRES_USER || 'zekka',
      password: process.env.POSTGRES_PASSWORD
    });

    this.ready = false;
  }

  async initialize() {
    this.logger.info('🔧 Initializing Orchestrator...');
    
    // Test database connection
    try {
      await this.db.query('SELECT NOW()');
      this.logger.info('✅ Database connected');
    } catch (error) {
      this.logger.error('❌ Database connection failed:', error.message);
      throw error;
    }

    // Test Ollama connection
    try {
      await axios.get(`${this.config.ollamaHost}/api/tags`);
      this.logger.info('✅ Ollama connected');
    } catch (error) {
      this.logger.warn('⚠️  Ollama not available:', error.message);
    }

    this.ready = true;
    this.logger.info('✅ Orchestrator ready');
  }

  isReady() {
    return this.ready;
  }

  // ========================================
  // Project Management
  // ========================================

  async createProject(data) {
    const projectId = `proj-${uuidv4().substring(0, 8)}`;
    
    const { name, requirements, storyPoints, budget } = data;
    
    // Insert into database
    await this.db.query(
      `INSERT INTO projects (project_id, name, description, story_points, budget_daily, budget_monthly, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        projectId,
        name,
        JSON.stringify(requirements),
        storyPoints || 8,
        budget?.daily || this.tokenEconomics.dailyBudget,
        budget?.monthly || this.tokenEconomics.monthlyBudget,
        'created'
      ]
    );

    // Set project context
    await this.contextBus.setProjectContext(projectId, {
      projectId,
      name,
      requirements,
      storyPoints,
      budget,
      status: 'created',
      createdAt: new Date().toISOString()
    });

    this.logger.info(`✅ Project created: ${projectId}`);
    
    return { projectId, name, status: 'created' };
  }

  async getProject(projectId) {
    const result = await this.db.query(
      'SELECT * FROM projects WHERE project_id = $1',
      [projectId]
    );

    if (result.rows.length === 0) return null;

    const project = result.rows[0];
    const tasks = await this.getProjectTasks(projectId);
    const context = await this.contextBus.getProjectContext(projectId);

    return {
      ...project,
      description: typeof project.description === 'string' ? JSON.parse(project.description) : project.description,
      tasks,
      context
    };
  }

  async listProjects() {
    const result = await this.db.query(
      'SELECT * FROM projects ORDER BY created_at DESC LIMIT 50'
    );

    return result.rows.map(p => ({
      ...p,
      description: typeof p.description === 'string' ? JSON.parse(p.description) : p.description
    }));
  }

  async getProjectTasks(projectId) {
    const result = await this.db.query(
      'SELECT * FROM tasks WHERE project_id = $1 ORDER BY stage, created_at',
      [projectId]
    );

    return result.rows;
  }

  // ========================================
  // Workflow Execution
  // ========================================

  async executeProject(projectId) {
    this.logger.info(`🚀 Starting execution for project: ${projectId}`);
    
    try {
      // Update project status
      await this.db.query(
        'UPDATE projects SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2',
        ['running', projectId]
      );

      const project = await this.getProject(projectId);
      
      // Execute stages sequentially
      const stages = [
        { number: 1, name: 'Authentication', complexity: 'low' },
        { number: 2, name: 'Security Setup', complexity: 'low' },
        { number: 3, name: 'Research', complexity: 'high', agents: 3 },
        { number: 4, name: 'Documentation', complexity: 'medium' },
        { number: 7, name: 'Development', complexity: 'high', agents: 6 },
        { number: 8, name: 'Testing', complexity: 'medium', agents: 2 },
        { number: 9, name: 'Validation', complexity: 'low' },
        { number: 10, name: 'Deployment', complexity: 'medium' }
      ];

      for (const stage of stages) {
        await this.executeStage(projectId, stage);
      }

      // Mark as completed
      await this.db.query(
        'UPDATE projects SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2',
        ['completed', projectId]
      );

      this.logger.info(`✅ Project completed: ${projectId}`);
      
      return { projectId, status: 'completed' };
    } catch (error) {
      this.logger.error(`❌ Project failed: ${projectId}`, error);
      
      await this.db.query(
        'UPDATE projects SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2',
        ['failed', projectId]
      );

      throw error;
    }
  }

  async executeStage(projectId, stageInfo) {
    const { number, name, complexity, agents: agentCount = 1 } = stageInfo;
    
    this.logger.info(`📍 Stage ${number}: ${name} (${agentCount} agents)`);
    
    // Select appropriate model based on complexity and budget
    const model = await this.tokenEconomics.selectModel(complexity, projectId);
    
    // Create tasks for each agent
    const tasks = [];
    for (let i = 0; i < agentCount; i++) {
      const taskId = `task-${uuidv4().substring(0, 8)}`;
      const agentName = `agent-${number}-${i + 1}`;
      
      const task = await this.createTask({
        taskId,
        projectId,
        stage: number,
        agentName,
        model
      });
      
      tasks.push(task);
    }

    // Execute tasks (simplified simulation)
    for (const task of tasks) {
      await this.executeTask(task.task_id, model);
    }

    // Check for conflicts
    const conflicts = await this.checkForConflicts(projectId, number);
    if (conflicts.length > 0) {
      this.logger.warn(`⚠️  ${conflicts.length} conflict(s) detected in stage ${number}`);
      // Conflicts would be handled by Arbitrator Agent
    }

    this.logger.info(`✅ Stage ${number} completed`);
  }

  async createTask(data) {
    const { taskId, projectId, stage, agentName, model } = data;
    
    await this.db.query(
      `INSERT INTO tasks (task_id, project_id, stage, agent_name, status, input_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [taskId, projectId, stage, agentName, 'pending', JSON.stringify({ model })]
    );

    // Set agent state in Context Bus
    await this.contextBus.setAgentState(taskId, agentName, {
      status: 'idle',
      model
    });

    return { task_id: taskId, agent_name: agentName, status: 'pending' };
  }

  async executeTask(taskId, model) {
    // Simulate task execution
    const startTime = Date.now();
    
    // Update task status
    await this.db.query(
      'UPDATE tasks SET status = $1, started_at = CURRENT_TIMESTAMP WHERE task_id = $2',
      ['running', taskId]
    );

    try {
      // Simulate AI call (would actually call Ollama/Claude here)
      const result = await this.simulateAgentWork(taskId, model);
      
      // Record cost
      await this.tokenEconomics.recordCost({
        projectId: result.projectId,
        taskId,
        agentName: result.agentName,
        model,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput
      });

      // Complete task
      await this.db.query(
        `UPDATE tasks SET status = $1, completed_at = CURRENT_TIMESTAMP, output_data = $2 
         WHERE task_id = $3`,
        ['completed', JSON.stringify(result), taskId]
      );

      const duration = Date.now() - startTime;
      this.logger.info(`✅ Task ${taskId} completed in ${duration}ms`);
      
      return result;
    } catch (error) {
      await this.db.query(
        'UPDATE tasks SET status = $1, error_message = $2 WHERE task_id = $3',
        ['failed', error.message, taskId]
      );
      
      throw error;
    }
  }

  async simulateAgentWork(taskId, model) {
    // Get task details
    const result = await this.db.query('SELECT * FROM tasks WHERE task_id = $1', [taskId]);
    const task = result.rows[0];
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    
    // Simulate token usage (would be real from actual API calls)
    const tokensInput = Math.floor(Math.random() * 1000) + 500;
    const tokensOutput = Math.floor(Math.random() * 2000) + 1000;
    
    return {
      projectId: task.project_id,
      taskId,
      agentName: task.agent_name,
      stage: task.stage,
      tokensInput,
      tokensOutput,
      result: `Simulated output for task ${taskId} using ${model}`,
      model
    };
  }

  async checkForConflicts(projectId, stage) {
    // Simplified conflict detection
    // In real implementation, would check file locks and modifications
    return [];
  }

  // ========================================
  // Metrics & Monitoring
  // ========================================

  async getMetrics() {
    const totalProjects = await this.db.query('SELECT COUNT(*) as count FROM projects');
    const runningTasks = await this.db.query("SELECT COUNT(*) as count FROM tasks WHERE status = 'running'");
    const completedTasks = await this.db.query("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'");
    
    const budgetStatus = await this.tokenEconomics.getBudgetStatus();
    const contextMetrics = await this.contextBus.getMetrics();

    return {
      projects: {
        total: parseInt(totalProjects.rows[0].count)
      },
      tasks: {
        running: parseInt(runningTasks.rows[0].count),
        completed: parseInt(completedTasks.rows[0].count)
      },
      budget: budgetStatus,
      context: contextMetrics
    };
  }

  // ========================================
  // Shutdown
  // ========================================

  async shutdown() {
    this.logger.info('🛑 Shutting down orchestrator...');
    await this.db.end();
    this.ready = false;
  }
}

module.exports = ZekkaOrchestrator;
