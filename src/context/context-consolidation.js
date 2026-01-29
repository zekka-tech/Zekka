/**
 * Context Consolidation System
 * Aggregates, organizes, and manages context from multiple sources
 * Integrates with Research Automation, Agent Zero, and external data sources
 */

const EventEmitter = require('events');

class ContextConsolidation extends EventEmitter {
  constructor(contextBus, logger, researchAutomation, config = {}) {
    super();
    this.contextBus = contextBus;
    this.logger = logger;
    this.researchAutomation = researchAutomation;
    this.config = {
      maxContextSize: config.maxContextSize || 100000, // characters
      compressionThreshold: config.compressionThreshold || 0.8,
      autoConsolidate: config.autoConsolidate !== false,
      consolidationInterval: config.consolidationInterval || 300000, // 5 minutes
      ...config
    };

    this.contexts = new Map();
    this.contextIndex = new Map(); // For fast lookup
    this.consolidationHistory = [];
  }

  /**
   * Initialize context consolidation system
   */
  async initialize() {
    this.logger.info('[Context] Initializing context consolidation system...');

    try {
      // Setup automatic consolidation if enabled
      if (this.config.autoConsolidate) {
        this.setupAutoConsolidation();
      }

      // Subscribe to relevant events
      this.setupEventListeners();

      await this.contextBus.publish('context.initialized', {
        timestamp: new Date().toISOString()
      });

      this.logger.info(
        '[Context] Context consolidation initialized successfully'
      );
      return true;
    } catch (error) {
      this.logger.error('[Context] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Create new context for a project
   */
  async createContext(projectId, initialData = {}) {
    this.logger.info(`[Context] Creating context for project: ${projectId}`);

    const context = {
      id: `context-${projectId}`,
      projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      data: {
        project: initialData.project || {},
        requirements: initialData.requirements || [],
        research: {},
        agents: {},
        workflow: {},
        decisions: [],
        artifacts: [],
        metadata: {}
      },
      size: 0,
      compressed: false,
      consolidations: 0
    };

    // Calculate initial size
    context.size = this.calculateContextSize(context);

    // Store context
    this.contexts.set(projectId, context);
    this.indexContext(context);

    // Publish creation event
    await this.contextBus.publish('context.created', {
      projectId,
      contextId: context.id,
      timestamp: context.createdAt
    });

    return context;
  }

  /**
   * Update context with new data
   */
  async updateContext(projectId, updates) {
    this.logger.info(`[Context] Updating context for project: ${projectId}`);

    const context = this.contexts.get(projectId);
    if (!context) {
      throw new Error(`Context not found for project: ${projectId}`);
    }

    // Apply updates
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'research') {
        context.data.research = { ...context.data.research, ...value };
      } else if (key === 'agents') {
        context.data.agents = { ...context.data.agents, ...value };
      } else if (key === 'workflow') {
        context.data.workflow = { ...context.data.workflow, ...value };
      } else if (key === 'decisions') {
        context.data.decisions.push(
          ...(Array.isArray(value) ? value : [value])
        );
      } else if (key === 'artifacts') {
        context.data.artifacts.push(
          ...(Array.isArray(value) ? value : [value])
        );
      } else {
        context.data[key] = value;
      }
    }

    // Update metadata
    context.updatedAt = new Date().toISOString();
    context.version++;
    context.size = this.calculateContextSize(context);

    // Check if consolidation needed
    if (this.needsConsolidation(context)) {
      await this.consolidate(projectId);
    }

    // Reindex
    this.indexContext(context);

    // Publish update event
    await this.contextBus.publish('context.updated', {
      projectId,
      contextId: context.id,
      version: context.version,
      size: context.size,
      timestamp: context.updatedAt
    });

    return context;
  }

  /**
   * Consolidate context - compress, deduplicate, and optimize
   */
  async consolidate(projectId) {
    this.logger.info(
      `[Context] Consolidating context for project: ${projectId}`
    );

    const context = this.contexts.get(projectId);
    if (!context) {
      throw new Error(`Context not found for project: ${projectId}`);
    }

    const beforeSize = context.size;
    const consolidation = {
      projectId,
      timestamp: new Date().toISOString(),
      beforeSize,
      operations: []
    };

    try {
      // 1. Deduplicate decisions
      const beforeDecisions = context.data.decisions.length;
      context.data.decisions = this.deduplicateDecisions(
        context.data.decisions
      );
      const afterDecisions = context.data.decisions.length;
      if (beforeDecisions !== afterDecisions) {
        consolidation.operations.push({
          type: 'deduplicate',
          target: 'decisions',
          removed: beforeDecisions - afterDecisions
        });
      }

      // 2. Compress old research
      const researchKeys = Object.keys(context.data.research);
      let compressedResearch = 0;
      for (const key of researchKeys) {
        const research = context.data.research[key];
        if (this.shouldCompressResearch(research)) {
          context.data.research[key] = this.compressResearch(research);
          compressedResearch++;
        }
      }
      if (compressedResearch > 0) {
        consolidation.operations.push({
          type: 'compress',
          target: 'research',
          count: compressedResearch
        });
      }

      // 3. Archive old artifacts
      const oldArtifacts = context.data.artifacts.filter((a) => this.isOldArtifact(a));
      if (oldArtifacts.length > 0) {
        const archived = await this.archiveArtifacts(projectId, oldArtifacts);
        context.data.artifacts = context.data.artifacts.filter(
          (a) => !this.isOldArtifact(a)
        );
        consolidation.operations.push({
          type: 'archive',
          target: 'artifacts',
          count: archived
        });
      }

      // 4. Optimize metadata
      context.data.metadata = this.optimizeMetadata(context.data.metadata);
      consolidation.operations.push({
        type: 'optimize',
        target: 'metadata'
      });

      // Update context
      const afterSize = this.calculateContextSize(context);
      context.size = afterSize;
      context.compressed = true;
      context.consolidations++;
      context.updatedAt = new Date().toISOString();

      consolidation.afterSize = afterSize;
      consolidation.reduction = `${(((beforeSize - afterSize) / beforeSize) * 100).toFixed(2)}%`;

      // Store consolidation record
      this.consolidationHistory.push(consolidation);

      // Publish consolidation event
      await this.contextBus.publish('context.consolidated', {
        projectId,
        reduction: consolidation.reduction,
        operations: consolidation.operations.length,
        timestamp: consolidation.timestamp
      });

      this.logger.info(
        `[Context] Consolidated ${projectId}: ${beforeSize} → ${afterSize} (${consolidation.reduction} reduction)`
      );

      return consolidation;
    } catch (error) {
      this.logger.error(
        `[Context] Consolidation failed for ${projectId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get context for a project
   */
  getContext(projectId) {
    return this.contexts.get(projectId);
  }

  /**
   * Search contexts
   */
  searchContexts(query) {
    const results = [];

    for (const [projectId, context] of this.contexts) {
      const relevance = this.calculateRelevance(context, query);
      if (relevance > 0) {
        results.push({
          projectId,
          context,
          relevance
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Merge research into context
   */
  async mergeResearch(projectId, researchTopic, researchData) {
    this.logger.info(
      `[Context] Merging research "${researchTopic}" into project ${projectId}`
    );

    const updates = {
      research: {
        [researchTopic]: {
          ...researchData,
          mergedAt: new Date().toISOString()
        }
      }
    };

    return await this.updateContext(projectId, updates);
  }

  /**
   * Add agent activity to context
   */
  async addAgentActivity(projectId, agentRole, activity) {
    this.logger.info(
      `[Context] Adding ${agentRole} activity to project ${projectId}`
    );

    const context = this.contexts.get(projectId);
    if (!context) {
      throw new Error(`Context not found for project: ${projectId}`);
    }

    if (!context.data.agents[agentRole]) {
      context.data.agents[agentRole] = {
        activities: [],
        metrics: {}
      };
    }

    context.data.agents[agentRole].activities.push({
      ...activity,
      timestamp: new Date().toISOString()
    });

    return await this.updateContext(projectId, {
      agents: context.data.agents
    });
  }

  /**
   * Record decision
   */
  async recordDecision(projectId, decision) {
    this.logger.info(`[Context] Recording decision for project ${projectId}`);

    const decisionRecord = {
      id: `decision-${Date.now()}`,
      ...decision,
      timestamp: new Date().toISOString()
    };

    return await this.updateContext(projectId, {
      decisions: [decisionRecord]
    });
  }

  /**
   * Add artifact
   */
  async addArtifact(projectId, artifact) {
    this.logger.info(`[Context] Adding artifact to project ${projectId}`);

    const artifactRecord = {
      id: `artifact-${Date.now()}`,
      ...artifact,
      timestamp: new Date().toISOString()
    };

    return await this.updateContext(projectId, {
      artifacts: [artifactRecord]
    });
  }

  /**
   * Export context for external use
   */
  async exportContext(projectId, format = 'json') {
    this.logger.info(
      `[Context] Exporting context for project ${projectId} as ${format}`
    );

    const context = this.contexts.get(projectId);
    if (!context) {
      throw new Error(`Context not found for project: ${projectId}`);
    }

    switch (format) {
    case 'json':
      return JSON.stringify(context, null, 2);

    case 'markdown':
      return this.contextToMarkdown(context);

    case 'summary':
      return this.contextToSummary(context);

    default:
      throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Helper methods
   */
  calculateContextSize(context) {
    return JSON.stringify(context.data).length;
  }

  needsConsolidation(context) {
    const sizeRatio = context.size / this.config.maxContextSize;
    return sizeRatio > this.config.compressionThreshold;
  }

  deduplicateDecisions(decisions) {
    const seen = new Set();
    return decisions.filter((d) => {
      const key = `${d.type}-${d.decision}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  shouldCompressResearch(research) {
    // Compress research older than 7 days
    if (!research.mergedAt) return false;
    const age = Date.now() - Date.parse(research.mergedAt);
    return age > 7 * 24 * 60 * 60 * 1000;
  }

  compressResearch(research) {
    // Keep only essential data
    return {
      topic: research.topic,
      summary: research.synthesized?.summary || '',
      keyFindings: research.synthesized?.keyFindings || [],
      confidence: research.synthesized?.confidence || 0,
      mergedAt: research.mergedAt,
      compressed: true
    };
  }

  isOldArtifact(artifact) {
    // Artifacts older than 30 days
    if (!artifact.timestamp) return false;
    const age = Date.now() - Date.parse(artifact.timestamp);
    return age > 30 * 24 * 60 * 60 * 1000;
  }

  async archiveArtifacts(projectId, artifacts) {
    // In real implementation, would store in external archive (S3, etc.)
    this.logger.info(
      `[Context] Archiving ${artifacts.length} old artifacts for project ${projectId}`
    );

    // Store archive reference in context bus
    await this.contextBus.set(
      `archive:${projectId}:artifacts`,
      JSON.stringify(artifacts),
      2592000 // 30 days TTL
    );

    return artifacts.length;
  }

  optimizeMetadata(metadata) {
    // Remove redundant or unused metadata
    const optimized = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== null && value !== undefined && value !== '') {
        optimized[key] = value;
      }
    }
    return optimized;
  }

  indexContext(context) {
    // Index for fast lookup
    const keywords = this.extractKeywords(context);
    for (const keyword of keywords) {
      if (!this.contextIndex.has(keyword)) {
        this.contextIndex.set(keyword, []);
      }
      const projects = this.contextIndex.get(keyword);
      if (!projects.includes(context.projectId)) {
        projects.push(context.projectId);
      }
    }
  }

  extractKeywords(context) {
    const keywords = new Set();

    // Extract from project data
    if (context.data.project?.name) {
      keywords.add(context.data.project.name.toLowerCase());
    }

    // Extract from requirements
    for (const req of context.data.requirements || []) {
      if (typeof req === 'string') {
        req
          .toLowerCase()
          .split(/\s+/)
          .forEach((word) => {
            if (word.length > 3) keywords.add(word);
          });
      }
    }

    // Extract from research topics
    for (const topic of Object.keys(context.data.research || {})) {
      keywords.add(topic.toLowerCase());
    }

    return Array.from(keywords);
  }

  calculateRelevance(context, query) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contextText = JSON.stringify(context.data).toLowerCase();

    let matches = 0;
    for (const word of queryWords) {
      if (contextText.includes(word)) {
        matches++;
      }
    }

    return matches / queryWords.length;
  }

  contextToMarkdown(context) {
    let md = `# Context: ${context.projectId}\n\n`;
    md += `**Created**: ${context.createdAt}\n`;
    md += `**Updated**: ${context.updatedAt}\n`;
    md += `**Version**: ${context.version}\n`;
    md += `**Size**: ${context.size} characters\n\n`;

    md += '## Project Information\n';
    md += `${JSON.stringify(context.data.project, null, 2)}\n\n`;

    md += '## Requirements\n';
    for (const req of context.data.requirements) {
      md += `- ${req}\n`;
    }
    md += '\n';

    md += '## Research\n';
    for (const [topic, research] of Object.entries(context.data.research)) {
      md += `### ${topic}\n`;
      md += `${research.synthesized?.summary || 'No summary available'}\n\n`;
    }

    md += `## Decisions (${context.data.decisions.length})\n`;
    for (const decision of context.data.decisions.slice(-10)) {
      md += `- **${decision.type}**: ${decision.decision}\n`;
    }

    return md;
  }

  contextToSummary(context) {
    return {
      projectId: context.projectId,
      version: context.version,
      size: context.size,
      lastUpdated: context.updatedAt,
      stats: {
        requirements: context.data.requirements.length,
        researchTopics: Object.keys(context.data.research).length,
        agentActivities: Object.keys(context.data.agents).length,
        decisions: context.data.decisions.length,
        artifacts: context.data.artifacts.length
      },
      compressed: context.compressed,
      consolidations: context.consolidations
    };
  }

  setupAutoConsolidation() {
    setInterval(async () => {
      for (const [projectId, context] of this.contexts) {
        if (this.needsConsolidation(context)) {
          try {
            await this.consolidate(projectId);
          } catch (error) {
            this.logger.error(
              `[Context] Auto-consolidation failed for ${projectId}:`,
              error
            );
          }
        }
      }
    }, this.config.consolidationInterval);
  }

  setupEventListeners() {
    // Listen for research completion
    this.contextBus.subscribe(
      'research.completed',
      async (channel, message) => {
        const data = typeof message === 'string' ? JSON.parse(message) : message;
        if (data.projectId) {
          await this.mergeResearch(data.projectId, data.topic, data.research);
        }
      }
    );

    // Listen for agent activities
    this.contextBus.subscribe('agent.*.completed', async (channel, message) => {
      const data = typeof message === 'string' ? JSON.parse(message) : message;
      if (data.projectId) {
        await this.addAgentActivity(data.projectId, data.agentRole, {
          task: data.task,
          result: data.result
        });
      }
    });
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      totalContexts: this.contexts.size,
      totalConsolidations: this.consolidationHistory.length,
      averageContextSize:
        Array.from(this.contexts.values()).reduce((sum, c) => sum + c.size, 0)
          / this.contexts.size || 0,
      indexedKeywords: this.contextIndex.size,
      recentConsolidations: this.consolidationHistory.slice(-10)
    };
  }
}

module.exports = ContextConsolidation;
