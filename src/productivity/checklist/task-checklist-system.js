/**
 * 100-Task Checklist System
 * Comprehensive task management and checklist system for complex projects
 * 
 * Features:
 * - Pre-defined templates (100+ tasks for various scenarios)
 * - Custom checklist creation
 * - Task dependencies and prerequisites
 * - Progress tracking and analytics
 * - Team collaboration and assignment
 * - Automated reminders and notifications
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class TaskChecklistSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxTasksPerChecklist: config.maxTasksPerChecklist || 500,
      autoSave: config.autoSave !== false,
      autoSaveInterval: config.autoSaveInterval || 60000, // 1 minute
      enableReminders: config.enableReminders !== false,
      reminderCheckInterval: config.reminderCheckInterval || 300000, // 5 minutes
      defaultPriority: config.defaultPriority || 'medium',
      ...config
    };
    
    // Checklists storage
    this.checklists = new Map(); // checklistId -> checklist object
    
    // Tasks storage
    this.tasks = new Map(); // taskId -> task object
    
    // Templates
    this.templates = this.initializeTemplates();
    
    // Statistics
    this.stats = {
      totalChecklists: 0,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      blockedTasks: 0,
      overdueTasks: 0,
      completionRate: 0
    };
    
    // Initialize auto-save if enabled
    if (this.config.autoSave) {
      this.autoSaveInterval = setInterval(() => {
        this.autoSave();
      }, this.config.autoSaveInterval);
    }
    
    // Initialize reminder checking if enabled
    if (this.config.enableReminders) {
      this.reminderInterval = setInterval(() => {
        this.checkReminders();
      }, this.config.reminderCheckInterval);
    }
    
    console.log('100-Task Checklist System initialized');
  }
  
  /**
   * Initialize pre-defined templates
   */
  initializeTemplates() {
    return {
      'software-development-full': {
        name: 'Full Software Development Lifecycle',
        description: '100-task checklist for complete software project',
        category: 'development',
        taskCount: 100,
        sections: [
          {
            name: 'Planning & Requirements',
            tasks: [
              { title: 'Define project scope and objectives', priority: 'high', estimatedHours: 8 },
              { title: 'Identify stakeholders and their requirements', priority: 'high', estimatedHours: 4 },
              { title: 'Create product vision document', priority: 'high', estimatedHours: 6 },
              { title: 'Develop user personas', priority: 'medium', estimatedHours: 4 },
              { title: 'Create user stories and use cases', priority: 'high', estimatedHours: 8 },
              { title: 'Define functional requirements', priority: 'high', estimatedHours: 6 },
              { title: 'Define non-functional requirements', priority: 'high', estimatedHours: 4 },
              { title: 'Create requirements traceability matrix', priority: 'medium', estimatedHours: 3 },
              { title: 'Conduct feasibility study', priority: 'high', estimatedHours: 6 },
              { title: 'Define project timeline and milestones', priority: 'high', estimatedHours: 4 }
            ]
          },
          {
            name: 'Architecture & Design',
            tasks: [
              { title: 'Design system architecture', priority: 'high', estimatedHours: 12 },
              { title: 'Create database schema design', priority: 'high', estimatedHours: 8 },
              { title: 'Design API endpoints and contracts', priority: 'high', estimatedHours: 6 },
              { title: 'Create UI/UX wireframes', priority: 'high', estimatedHours: 10 },
              { title: 'Design component hierarchy', priority: 'medium', estimatedHours: 6 },
              { title: 'Define security architecture', priority: 'high', estimatedHours: 8 },
              { title: 'Plan scalability and performance strategy', priority: 'high', estimatedHours: 6 },
              { title: 'Create design mockups', priority: 'medium', estimatedHours: 12 },
              { title: 'Define coding standards and conventions', priority: 'medium', estimatedHours: 4 },
              { title: 'Document architecture decisions', priority: 'medium', estimatedHours: 6 }
            ]
          },
          {
            name: 'Development Setup',
            tasks: [
              { title: 'Set up version control repository', priority: 'high', estimatedHours: 2 },
              { title: 'Configure CI/CD pipeline', priority: 'high', estimatedHours: 8 },
              { title: 'Set up development environment', priority: 'high', estimatedHours: 4 },
              { title: 'Install and configure dependencies', priority: 'high', estimatedHours: 3 },
              { title: 'Set up code quality tools', priority: 'medium', estimatedHours: 4 },
              { title: 'Configure linting and formatting', priority: 'medium', estimatedHours: 2 },
              { title: 'Set up testing framework', priority: 'high', estimatedHours: 4 },
              { title: 'Configure environment variables', priority: 'high', estimatedHours: 2 },
              { title: 'Set up logging and monitoring', priority: 'medium', estimatedHours: 6 },
              { title: 'Create project documentation structure', priority: 'medium', estimatedHours: 3 }
            ]
          },
          {
            name: 'Backend Development',
            tasks: [
              { title: 'Implement database models', priority: 'high', estimatedHours: 12 },
              { title: 'Create database migrations', priority: 'high', estimatedHours: 6 },
              { title: 'Implement authentication system', priority: 'high', estimatedHours: 16 },
              { title: 'Implement authorization and roles', priority: 'high', estimatedHours: 12 },
              { title: 'Create RESTful API endpoints', priority: 'high', estimatedHours: 24 },
              { title: 'Implement business logic layer', priority: 'high', estimatedHours: 20 },
              { title: 'Add input validation', priority: 'high', estimatedHours: 8 },
              { title: 'Implement error handling', priority: 'high', estimatedHours: 6 },
              { title: 'Add API rate limiting', priority: 'medium', estimatedHours: 4 },
              { title: 'Implement caching strategy', priority: 'medium', estimatedHours: 8 }
            ]
          },
          {
            name: 'Frontend Development',
            tasks: [
              { title: 'Set up frontend framework', priority: 'high', estimatedHours: 4 },
              { title: 'Implement routing system', priority: 'high', estimatedHours: 6 },
              { title: 'Create reusable UI components', priority: 'high', estimatedHours: 16 },
              { title: 'Implement state management', priority: 'high', estimatedHours: 12 },
              { title: 'Integrate with backend APIs', priority: 'high', estimatedHours: 16 },
              { title: 'Implement authentication flow', priority: 'high', estimatedHours: 10 },
              { title: 'Create responsive layouts', priority: 'high', estimatedHours: 12 },
              { title: 'Implement form validation', priority: 'medium', estimatedHours: 8 },
              { title: 'Add loading states and spinners', priority: 'low', estimatedHours: 4 },
              { title: 'Implement error boundaries', priority: 'medium', estimatedHours: 4 }
            ]
          },
          {
            name: 'Testing',
            tasks: [
              { title: 'Write unit tests for backend', priority: 'high', estimatedHours: 20 },
              { title: 'Write unit tests for frontend', priority: 'high', estimatedHours: 16 },
              { title: 'Create integration tests', priority: 'high', estimatedHours: 16 },
              { title: 'Implement end-to-end tests', priority: 'high', estimatedHours: 12 },
              { title: 'Perform security testing', priority: 'high', estimatedHours: 8 },
              { title: 'Conduct performance testing', priority: 'high', estimatedHours: 8 },
              { title: 'Execute load testing', priority: 'medium', estimatedHours: 6 },
              { title: 'Perform usability testing', priority: 'medium', estimatedHours: 8 },
              { title: 'Conduct accessibility testing', priority: 'medium', estimatedHours: 6 },
              { title: 'Execute regression testing', priority: 'medium', estimatedHours: 8 }
            ]
          },
          {
            name: 'Security',
            tasks: [
              { title: 'Implement HTTPS/SSL', priority: 'high', estimatedHours: 4 },
              { title: 'Add CORS configuration', priority: 'high', estimatedHours: 2 },
              { title: 'Implement CSRF protection', priority: 'high', estimatedHours: 4 },
              { title: 'Add XSS prevention', priority: 'high', estimatedHours: 4 },
              { title: 'Implement SQL injection prevention', priority: 'high', estimatedHours: 4 },
              { title: 'Add input sanitization', priority: 'high', estimatedHours: 6 },
              { title: 'Implement rate limiting', priority: 'medium', estimatedHours: 4 },
              { title: 'Add security headers', priority: 'medium', estimatedHours: 2 },
              { title: 'Conduct security audit', priority: 'high', estimatedHours: 12 },
              { title: 'Fix identified vulnerabilities', priority: 'high', estimatedHours: 16 }
            ]
          },
          {
            name: 'Optimization',
            tasks: [
              { title: 'Optimize database queries', priority: 'high', estimatedHours: 12 },
              { title: 'Implement database indexing', priority: 'high', estimatedHours: 6 },
              { title: 'Optimize frontend bundle size', priority: 'medium', estimatedHours: 8 },
              { title: 'Implement code splitting', priority: 'medium', estimatedHours: 6 },
              { title: 'Add lazy loading', priority: 'medium', estimatedHours: 6 },
              { title: 'Optimize images and assets', priority: 'medium', estimatedHours: 4 },
              { title: 'Implement browser caching', priority: 'medium', estimatedHours: 4 },
              { title: 'Add CDN integration', priority: 'low', estimatedHours: 6 },
              { title: 'Optimize API response times', priority: 'high', estimatedHours: 8 },
              { title: 'Implement database connection pooling', priority: 'medium', estimatedHours: 4 }
            ]
          },
          {
            name: 'Documentation',
            tasks: [
              { title: 'Write API documentation', priority: 'high', estimatedHours: 12 },
              { title: 'Create user guide', priority: 'high', estimatedHours: 10 },
              { title: 'Write deployment guide', priority: 'high', estimatedHours: 8 },
              { title: 'Document architecture', priority: 'medium', estimatedHours: 8 },
              { title: 'Create developer onboarding docs', priority: 'medium', estimatedHours: 6 },
              { title: 'Write troubleshooting guide', priority: 'medium', estimatedHours: 6 },
              { title: 'Document configuration options', priority: 'medium', estimatedHours: 4 },
              { title: 'Create FAQ section', priority: 'low', estimatedHours: 4 },
              { title: 'Write changelog', priority: 'medium', estimatedHours: 3 },
              { title: 'Create README file', priority: 'high', estimatedHours: 2 }
            ]
          },
          {
            name: 'Deployment & Launch',
            tasks: [
              { title: 'Set up production environment', priority: 'high', estimatedHours: 8 },
              { title: 'Configure production database', priority: 'high', estimatedHours: 6 },
              { title: 'Set up production server', priority: 'high', estimatedHours: 8 },
              { title: 'Configure domain and DNS', priority: 'high', estimatedHours: 3 },
              { title: 'Deploy application to production', priority: 'high', estimatedHours: 6 },
              { title: 'Set up monitoring and alerts', priority: 'high', estimatedHours: 8 },
              { title: 'Configure backup strategy', priority: 'high', estimatedHours: 6 },
              { title: 'Set up error tracking', priority: 'high', estimatedHours: 4 },
              { title: 'Perform final testing in production', priority: 'high', estimatedHours: 8 },
              { title: 'Launch application', priority: 'high', estimatedHours: 4 }
            ]
          }
        ]
      },
      
      'startup-launch': {
        name: 'Startup Launch Checklist',
        description: '50-task checklist for launching a startup',
        category: 'business',
        taskCount: 50,
        sections: [
          {
            name: 'Foundation',
            tasks: [
              { title: 'Validate business idea', priority: 'high', estimatedHours: 40 },
              { title: 'Conduct market research', priority: 'high', estimatedHours: 60 },
              { title: 'Define target audience', priority: 'high', estimatedHours: 20 },
              { title: 'Create business plan', priority: 'high', estimatedHours: 80 },
              { title: 'Register business entity', priority: 'high', estimatedHours: 16 }
            ]
          },
          {
            name: 'Product Development',
            tasks: [
              { title: 'Build MVP', priority: 'high', estimatedHours: 320 },
              { title: 'Get user feedback', priority: 'high', estimatedHours: 40 },
              { title: 'Iterate on product', priority: 'high', estimatedHours: 160 },
              { title: 'Develop go-to-market strategy', priority: 'high', estimatedHours: 60 },
              { title: 'Create pricing strategy', priority: 'high', estimatedHours: 40 }
            ]
          }
        ]
      },
      
      'devops-setup': {
        name: 'DevOps Infrastructure Setup',
        description: '40-task checklist for DevOps infrastructure',
        category: 'devops',
        taskCount: 40,
        sections: [
          {
            name: 'Infrastructure',
            tasks: [
              { title: 'Set up cloud provider account', priority: 'high', estimatedHours: 4 },
              { title: 'Configure VPC and networking', priority: 'high', estimatedHours: 8 },
              { title: 'Set up compute instances', priority: 'high', estimatedHours: 6 },
              { title: 'Configure load balancers', priority: 'high', estimatedHours: 6 },
              { title: 'Set up database clusters', priority: 'high', estimatedHours: 12 }
            ]
          },
          {
            name: 'CI/CD',
            tasks: [
              { title: 'Configure CI/CD pipeline', priority: 'high', estimatedHours: 16 },
              { title: 'Set up automated testing', priority: 'high', estimatedHours: 12 },
              { title: 'Configure deployment automation', priority: 'high', estimatedHours: 10 },
              { title: 'Set up rollback procedures', priority: 'high', estimatedHours: 8 },
              { title: 'Implement blue-green deployment', priority: 'medium', estimatedHours: 12 }
            ]
          }
        ]
      }
    };
  }
  
  /**
   * Create new checklist
   */
  async createChecklist(options) {
    const checklistId = crypto.randomUUID();
    
    const checklist = {
      id: checklistId,
      name: options.name,
      description: options.description || '',
      category: options.category || 'general',
      createdBy: options.createdBy || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      template: options.template || null,
      tasks: [],
      progress: {
        total: 0,
        completed: 0,
        inProgress: 0,
        blocked: 0,
        percentage: 0
      },
      metadata: options.metadata || {}
    };
    
    // If template specified, populate tasks from template
    if (options.template && this.templates[options.template]) {
      const template = this.templates[options.template];
      
      for (const section of template.sections) {
        for (const taskTemplate of section.tasks) {
          const task = await this.addTask(checklistId, {
            ...taskTemplate,
            section: section.name,
            fromTemplate: true
          });
          checklist.tasks.push(task.id);
        }
      }
    }
    
    // Add custom tasks if provided
    if (options.tasks && Array.isArray(options.tasks)) {
      for (const taskData of options.tasks) {
        const task = await this.addTask(checklistId, taskData);
        checklist.tasks.push(task.id);
      }
    }
    
    // Update progress
    checklist.progress.total = checklist.tasks.length;
    
    this.checklists.set(checklistId, checklist);
    this.stats.totalChecklists++;
    
    this.emit('checklist.created', { checklistId, checklist });
    
    console.log(`Checklist created: ${checklistId} - ${checklist.name}`);
    
    return checklist;
  }
  
  /**
   * Add task to checklist
   */
  async addTask(checklistId, taskData) {
    const checklist = this.checklists.get(checklistId);
    
    if (!checklist) {
      throw new Error(`Checklist not found: ${checklistId}`);
    }
    
    if (checklist.tasks.length >= this.config.maxTasksPerChecklist) {
      throw new Error(`Maximum tasks per checklist reached: ${this.config.maxTasksPerChecklist}`);
    }
    
    const taskId = crypto.randomUUID();
    
    const task = {
      id: taskId,
      checklistId,
      title: taskData.title,
      description: taskData.description || '',
      section: taskData.section || 'General',
      priority: taskData.priority || this.config.defaultPriority,
      status: 'pending',
      assignedTo: taskData.assignedTo || null,
      dependencies: taskData.dependencies || [],
      estimatedHours: taskData.estimatedHours || 0,
      actualHours: 0,
      dueDate: taskData.dueDate || null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: taskData.tags || [],
      metadata: taskData.metadata || {},
      fromTemplate: taskData.fromTemplate || false
    };
    
    this.tasks.set(taskId, task);
    this.stats.totalTasks++;
    
    // Update checklist
    checklist.tasks.push(taskId);
    checklist.progress.total++;
    checklist.updatedAt = new Date();
    
    this.emit('task.created', { checklistId, taskId, task });
    
    return task;
  }
  
  /**
   * Update task status
   */
  async updateTaskStatus(taskId, newStatus, metadata = {}) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    const oldStatus = task.status;
    task.status = newStatus;
    task.updatedAt = new Date();
    
    // Update statistics
    if (oldStatus !== 'completed' && newStatus === 'completed') {
      task.completedAt = new Date();
      this.stats.completedTasks++;
      
      if (oldStatus === 'in-progress') {
        this.stats.inProgressTasks--;
      } else if (oldStatus === 'blocked') {
        this.stats.blockedTasks--;
      }
    } else if (oldStatus === 'completed' && newStatus !== 'completed') {
      task.completedAt = null;
      this.stats.completedTasks--;
    }
    
    if (newStatus === 'in-progress' && oldStatus !== 'in-progress') {
      this.stats.inProgressTasks++;
    } else if (oldStatus === 'in-progress' && newStatus !== 'in-progress') {
      this.stats.inProgressTasks--;
    }
    
    if (newStatus === 'blocked' && oldStatus !== 'blocked') {
      this.stats.blockedTasks++;
    } else if (oldStatus === 'blocked' && newStatus !== 'blocked') {
      this.stats.blockedTasks--;
    }
    
    // Update checklist progress
    const checklist = this.checklists.get(task.checklistId);
    if (checklist) {
      this.updateChecklistProgress(checklist.id);
    }
    
    // Check if dependent tasks can be unblocked
    if (newStatus === 'completed') {
      await this.checkDependentTasks(taskId);
    }
    
    this.emit('task.status.updated', {
      taskId,
      oldStatus,
      newStatus,
      task,
      metadata
    });
    
    return task;
  }
  
  /**
   * Update checklist progress
   */
  updateChecklistProgress(checklistId) {
    const checklist = this.checklists.get(checklistId);
    
    if (!checklist) {
      return;
    }
    
    let completed = 0;
    let inProgress = 0;
    let blocked = 0;
    
    for (const taskId of checklist.tasks) {
      const task = this.tasks.get(taskId);
      if (!task) continue;
      
      if (task.status === 'completed') completed++;
      else if (task.status === 'in-progress') inProgress++;
      else if (task.status === 'blocked') blocked++;
    }
    
    checklist.progress = {
      total: checklist.tasks.length,
      completed,
      inProgress,
      blocked,
      percentage: checklist.tasks.length > 0 
        ? Math.round((completed / checklist.tasks.length) * 100) 
        : 0
    };
    
    checklist.updatedAt = new Date();
    
    // Update overall completion rate
    this.updateCompletionRate();
    
    this.emit('checklist.progress.updated', {
      checklistId,
      progress: checklist.progress
    });
  }
  
  /**
   * Check dependent tasks
   */
  async checkDependentTasks(completedTaskId) {
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.dependencies.includes(completedTaskId) && task.status === 'blocked') {
        // Check if all dependencies are completed
        const allDepsCompleted = task.dependencies.every(depId => {
          const depTask = this.tasks.get(depId);
          return depTask && depTask.status === 'completed';
        });
        
        if (allDepsCompleted) {
          await this.updateTaskStatus(taskId, 'pending', {
            reason: 'dependencies_completed'
          });
        }
      }
    }
  }
  
  /**
   * Assign task to user
   */
  async assignTask(taskId, userId) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    const previousAssignee = task.assignedTo;
    task.assignedTo = userId;
    task.updatedAt = new Date();
    
    this.emit('task.assigned', {
      taskId,
      userId,
      previousAssignee,
      task
    });
    
    return task;
  }
  
  /**
   * Get checklist
   */
  getChecklist(checklistId) {
    const checklist = this.checklists.get(checklistId);
    
    if (!checklist) {
      throw new Error(`Checklist not found: ${checklistId}`);
    }
    
    // Populate task details
    const tasks = checklist.tasks.map(taskId => this.tasks.get(taskId)).filter(Boolean);
    
    return {
      ...checklist,
      tasks
    };
  }
  
  /**
   * Get task
   */
  getTask(taskId) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    return task;
  }
  
  /**
   * Get all checklists
   */
  getAllChecklists(filters = {}) {
    let checklists = Array.from(this.checklists.values());
    
    // Apply filters
    if (filters.status) {
      checklists = checklists.filter(c => c.status === filters.status);
    }
    
    if (filters.category) {
      checklists = checklists.filter(c => c.category === filters.category);
    }
    
    if (filters.createdBy) {
      checklists = checklists.filter(c => c.createdBy === filters.createdBy);
    }
    
    return checklists;
  }
  
  /**
   * Get tasks by filters
   */
  getTasksByFilters(filters = {}) {
    let tasks = Array.from(this.tasks.values());
    
    if (filters.checklistId) {
      tasks = tasks.filter(t => t.checklistId === filters.checklistId);
    }
    
    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    
    if (filters.priority) {
      tasks = tasks.filter(t => t.priority === filters.priority);
    }
    
    if (filters.assignedTo) {
      tasks = tasks.filter(t => t.assignedTo === filters.assignedTo);
    }
    
    if (filters.section) {
      tasks = tasks.filter(t => t.section === filters.section);
    }
    
    return tasks;
  }
  
  /**
   * Get overdue tasks
   */
  getOverdueTasks() {
    const now = new Date();
    const overdue = [];
    
    for (const task of this.tasks.values()) {
      if (task.dueDate && new Date(task.dueDate) < now && task.status !== 'completed') {
        overdue.push(task);
      }
    }
    
    this.stats.overdueTasks = overdue.length;
    
    return overdue;
  }
  
  /**
   * Auto-save
   */
  autoSave() {
    // In production, this would save to database
    this.emit('checklist.auto.saved', {
      checklists: this.checklists.size,
      tasks: this.tasks.size,
      timestamp: new Date()
    });
  }
  
  /**
   * Check reminders
   */
  checkReminders() {
    const now = new Date();
    const reminderThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const task of this.tasks.values()) {
      if (task.dueDate && task.status !== 'completed') {
        const dueDate = new Date(task.dueDate);
        const timeUntilDue = dueDate.getTime() - now.getTime();
        
        if (timeUntilDue > 0 && timeUntilDue <= reminderThreshold) {
          this.emit('task.reminder', {
            taskId: task.id,
            task,
            hoursUntilDue: Math.floor(timeUntilDue / (60 * 60 * 1000))
          });
        }
      }
    }
  }
  
  /**
   * Update completion rate
   */
  updateCompletionRate() {
    if (this.stats.totalTasks === 0) {
      this.stats.completionRate = 0;
      return;
    }
    
    this.stats.completionRate = Math.round(
      (this.stats.completedTasks / this.stats.totalTasks) * 100
    );
  }
  
  /**
   * Get available templates
   */
  getTemplates() {
    return Object.entries(this.templates).map(([key, template]) => ({
      id: key,
      name: template.name,
      description: template.description,
      category: template.category,
      taskCount: template.taskCount
    }));
  }
  
  /**
   * Get statistics
   */
  getStatistics() {
    // Update overdue count
    this.getOverdueTasks();
    
    return {
      ...this.stats,
      checklists: {
        total: this.checklists.size,
        byStatus: this.getChecklistsByStatus(),
        byCategory: this.getChecklistsByCategory()
      },
      tasks: {
        total: this.tasks.size,
        byStatus: this.getTasksByStatus(),
        byPriority: this.getTasksByPriority()
      }
    };
  }
  
  getChecklistsByStatus() {
    const byStatus = {};
    for (const checklist of this.checklists.values()) {
      byStatus[checklist.status] = (byStatus[checklist.status] || 0) + 1;
    }
    return byStatus;
  }
  
  getChecklistsByCategory() {
    const byCategory = {};
    for (const checklist of this.checklists.values()) {
      byCategory[checklist.category] = (byCategory[checklist.category] || 0) + 1;
    }
    return byCategory;
  }
  
  getTasksByStatus() {
    const byStatus = {};
    for (const task of this.tasks.values()) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
    }
    return byStatus;
  }
  
  getTasksByPriority() {
    const byPriority = {};
    for (const task of this.tasks.values()) {
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    }
    return byPriority;
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
    }
    
    console.log('Task Checklist System cleaned up');
  }
}

module.exports = TaskChecklistSystem;
