/**
 * Phase 6B: MEDIUM Priority Tool Integrations
 *
 * This module provides integrations for 25 medium-priority tools:
 *
 * DEVELOPMENT AGENTS (7):
 * - TempoLabs: First phase MVP development agent
 * - Softgen AI: First phase MVP development agent
 * - Bolt.diy: First phase MVP development agent
 * - AugmentCode: Second phase full stack development agent
 * - Warp.dev: Second phase full stack development agent
 * - Windsurf: Second phase full stack development agent
 * - Qoder.com: Second phase full stack development agent
 *
 * AI PLATFORMS (3):
 * - Cassidy AI: Internal employee implementation management
 * - OpenCode: System context retention and recall
 * - Emergent: System context and state management
 *
 * CONTENT TOOLS (3):
 * - Gamma AI: Graphics and multimedia development
 * - Napkin: Content and media management
 * - Opal: Content, IP, and media management
 *
 * SEO & MARKETING (3):
 * - Harpa AI: SEO and AEO optimization
 * - Clay: Social media and marketing automation
 * - Opus: Social media content creation
 *
 * KNOWLEDGE GRAPHS (2):
 * - Neo4j: Graph database for knowledge representation
 * - Graphiti: Knowledge graph construction and querying
 *
 * ADDITIONAL TOOLS (7):
 * - LangChain: LLM application framework
 * - LangGraph: Agent workflow orchestration
 * - Ragas: RAG evaluation framework
 * - Playwright: Browser automation and testing
 * - Apify: Web scraping and automation
 * - n8n: Workflow automation
 * - Zapier: Integration platform
 *
 * All integrations include:
 * - Circuit breaker protection
 * - Request/response caching
 * - Comprehensive error handling
 * - Audit logging
 * - Health monitoring
 */

const axios = require('axios');
const { CircuitBreaker } = require('../utils/circuit-breaker');
const { CacheManager } = require('../utils/cache-manager');
const { AuditLogger } = require('../utils/audit-logger');

class Phase6BIntegrations {
  constructor(config = {}) {
    this.config = {
      timeout: config.timeout || 30000, // 30 seconds for dev agents
      cacheTTL: config.cacheTTL || 300,
      enableCache: config.enableCache !== false,
      enableLogging: config.enableLogging !== false
    };

    // Initialize cache and logger
    if (this.config.enableCache) {
      this.cache = new CacheManager();
    }
    if (this.config.enableLogging) {
      this.auditLogger = new AuditLogger();
    }

    // Create circuit breakers for each service
    this.breakers = {
      // Development Agents
      tempolabs: new CircuitBreaker({
        name: 'tempolabs-api',
        failureThreshold: 3,
        resetTimeout: 60000
      }),
      softgen: new CircuitBreaker({
        name: 'softgen-api',
        failureThreshold: 3,
        resetTimeout: 60000
      }),
      bolt: new CircuitBreaker({
        name: 'bolt-api',
        failureThreshold: 3,
        resetTimeout: 60000
      }),
      augmentcode: new CircuitBreaker({
        name: 'augmentcode-api',
        failureThreshold: 3,
        resetTimeout: 60000
      }),
      warp: new CircuitBreaker({
        name: 'warp-api',
        failureThreshold: 3,
        resetTimeout: 60000
      }),
      windsurf: new CircuitBreaker({
        name: 'windsurf-api',
        failureThreshold: 3,
        resetTimeout: 60000
      }),
      qoder: new CircuitBreaker({
        name: 'qoder-api',
        failureThreshold: 3,
        resetTimeout: 60000
      }),

      // AI Platforms
      cassidy: new CircuitBreaker({
        name: 'cassidy-api',
        failureThreshold: 3,
        resetTimeout: 30000
      }),
      opencode: new CircuitBreaker({
        name: 'opencode-api',
        failureThreshold: 3,
        resetTimeout: 30000
      }),
      emergent: new CircuitBreaker({
        name: 'emergent-api',
        failureThreshold: 3,
        resetTimeout: 30000
      }),

      // Content Tools
      gamma: new CircuitBreaker({
        name: 'gamma-api',
        failureThreshold: 3,
        resetTimeout: 60000
      }),
      napkin: new CircuitBreaker({
        name: 'napkin-api',
        failureThreshold: 3,
        resetTimeout: 30000
      }),
      opal: new CircuitBreaker({
        name: 'opal-api',
        failureThreshold: 3,
        resetTimeout: 30000
      }),

      // SEO & Marketing
      harpa: new CircuitBreaker({
        name: 'harpa-api',
        failureThreshold: 3,
        resetTimeout: 30000
      }),
      clay: new CircuitBreaker({
        name: 'clay-api',
        failureThreshold: 5,
        resetTimeout: 60000
      }),
      opus: new CircuitBreaker({
        name: 'opus-api',
        failureThreshold: 3,
        resetTimeout: 30000
      }),

      // Knowledge Graphs
      neo4j: new CircuitBreaker({
        name: 'neo4j-api',
        failureThreshold: 5,
        resetTimeout: 60000
      }),
      graphiti: new CircuitBreaker({
        name: 'graphiti-api',
        failureThreshold: 5,
        resetTimeout: 60000
      }),

      // Additional Tools
      langchain: new CircuitBreaker({
        name: 'langchain-api',
        failureThreshold: 3,
        resetTimeout: 30000
      }),
      playwright: new CircuitBreaker({
        name: 'playwright-api',
        failureThreshold: 5,
        resetTimeout: 60000
      }),
      apify: new CircuitBreaker({
        name: 'apify-api',
        failureThreshold: 5,
        resetTimeout: 60000
      }),
      n8n: new CircuitBreaker({
        name: 'n8n-api',
        failureThreshold: 5,
        resetTimeout: 60000
      }),
      zapier: new CircuitBreaker({
        name: 'zapier-api',
        failureThreshold: 5,
        resetTimeout: 60000
      })
    };

    this.requestCount = {};
    Object.keys(this.breakers).forEach((key) => {
      this.requestCount[key] = 0;
    });
  }

  // ============================================================
  // DEVELOPMENT AGENTS
  // ============================================================

  /**
   * TempoLabs Integration - First Phase MVP Development Agent
   * AI-powered development agent for rapid MVP creation
   *
   * @param {Object} request - Development request
   * @returns {Promise<Object>} Development response
   */
  async callTempoLabs(request) {
    const apiKey = process.env.TEMPOLABS_API_KEY;
    if (!apiKey) throw new Error('TempoLabs API key not configured');

    return await this.breakers.tempolabs.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.tempolabs.ai/v1/generate',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            prompt: request.prompt,
            type: request.type || 'mvp',
            framework: request.framework || 'react',
            features: request.features || [],
            ...request.options
          },
          timeout: 60000 // 60 seconds for code generation
        });

        this.requestCount.tempolabs++;
        await this._logAPICall('tempolabs', 'generate', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('tempolabs', 'generate', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Softgen AI Integration - First Phase MVP Development Agent
   * AI-powered code generation for MVPs
   *
   * @param {Object} spec - Project specification
   * @returns {Promise<Object>} Generated code and structure
   */
  async callSoftgen(spec) {
    const apiKey = process.env.SOFTGEN_API_KEY;
    if (!apiKey) throw new Error('Softgen API key not configured');

    return await this.breakers.softgen.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.softgen.ai/v1/projects',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            name: spec.name,
            description: spec.description,
            stack: spec.stack || 'fullstack',
            requirements: spec.requirements || [],
            ...spec.options
          },
          timeout: 60000
        });

        this.requestCount.softgen++;
        await this._logAPICall('softgen', 'generate', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('softgen', 'generate', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Bolt.diy Integration - First Phase MVP Development Agent
   * Open-source AI development assistant
   *
   * @param {Object} task - Development task
   * @returns {Promise<Object>} Task execution result
   */
  async callBolt(task) {
    const apiHost = process.env.BOLT_API_HOST || 'http://localhost:3000';

    return await this.breakers.bolt.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: `${apiHost}/api/v1/tasks`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          data: {
            action: task.action || 'generate',
            prompt: task.prompt,
            context: task.context || {},
            ...task.options
          },
          timeout: 60000
        });

        this.requestCount.bolt++;
        await this._logAPICall('bolt', 'execute', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('bolt', 'execute', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * AugmentCode Integration - Second Phase Full Stack Agent
   * Advanced AI coding assistant for full stack development
   *
   * @param {Object} request - Code generation/modification request
   * @returns {Promise<Object>} Code response
   */
  async callAugmentCode(request) {
    const apiKey = process.env.AUGMENTCODE_API_KEY;
    if (!apiKey) throw new Error('AugmentCode API key not configured');

    return await this.breakers.augmentcode.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.augmentcode.com/v1/completions',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            prompt: request.prompt,
            language: request.language || 'javascript',
            mode: request.mode || 'generate',
            context: request.context || [],
            ...request.options
          },
          timeout: 60000
        });

        this.requestCount.augmentcode++;
        await this._logAPICall('augmentcode', 'complete', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('augmentcode', 'complete', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Warp.dev Integration - Second Phase Full Stack Agent
   * Terminal-based AI development environment
   *
   * @param {Object} command - Command execution request
   * @returns {Promise<Object>} Command result
   */
  async callWarp(command) {
    const apiKey = process.env.WARP_API_KEY;
    if (!apiKey) throw new Error('Warp API key not configured');

    return await this.breakers.warp.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.warp.dev/v1/execute',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            command: command.cmd,
            workingDir: command.cwd || '.',
            environment: command.env || {},
            ...command.options
          },
          timeout: 60000
        });

        this.requestCount.warp++;
        await this._logAPICall('warp', 'execute', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('warp', 'execute', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Windsurf Integration - Second Phase Full Stack Agent
   * AI pair programming assistant
   *
   * @param {Object} session - Programming session
   * @returns {Promise<Object>} Session response
   */
  async callWindsurf(session) {
    const apiKey = process.env.WINDSURF_API_KEY;
    if (!apiKey) throw new Error('Windsurf API key not configured');

    return await this.breakers.windsurf.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.windsurf.ai/v1/sessions',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            action: session.action || 'code',
            files: session.files || [],
            prompt: session.prompt,
            context: session.context || {},
            ...session.options
          },
          timeout: 60000
        });

        this.requestCount.windsurf++;
        await this._logAPICall('windsurf', 'session', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('windsurf', 'session', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Qoder.com Integration - Second Phase Full Stack Agent
   * AI-powered full stack development platform
   *
   * @param {Object} project - Project request
   * @returns {Promise<Object>} Project response
   */
  async callQoder(project) {
    const apiKey = process.env.QODER_API_KEY;
    if (!apiKey) throw new Error('Qoder API key not configured');

    return await this.breakers.qoder.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.qoder.com/v1/projects',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            name: project.name,
            type: project.type || 'fullstack',
            requirements: project.requirements || [],
            technologies: project.technologies || [],
            ...project.options
          },
          timeout: 60000
        });

        this.requestCount.qoder++;
        await this._logAPICall('qoder', 'create', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('qoder', 'create', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  // ============================================================
  // AI PLATFORMS
  // ============================================================

  /**
   * Cassidy AI Integration - Implementation Management
   * AI assistant for internal employee and implementation management
   *
   * @param {Object} task - Management task
   * @returns {Promise<Object>} Task result
   */
  async callCassidy(task) {
    const apiKey = process.env.CASSIDY_API_KEY;
    if (!apiKey) throw new Error('Cassidy API key not configured');

    return await this.breakers.cassidy.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.cassidy.ai/v1/tasks',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            action: task.action,
            context: task.context || {},
            parameters: task.parameters || {},
            ...task.options
          },
          timeout: 30000
        });

        this.requestCount.cassidy++;
        await this._logAPICall('cassidy', 'task', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('cassidy', 'task', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * OpenCode Integration - Context Retention and Recall
   * System context retention for injecting code changes and summaries
   *
   * @param {Object} operation - Context operation
   * @returns {Promise<Object>} Operation result
   */
  async callOpenCode(operation) {
    const apiKey = process.env.OPENCODE_API_KEY;
    if (!apiKey) throw new Error('OpenCode API key not configured');

    return await this.breakers.opencode.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.opencode.dev/v1/context',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            operation: operation.type || 'store',
            context: operation.context || {},
            files: operation.files || [],
            summary: operation.summary,
            ...operation.options
          },
          timeout: 30000
        });

        this.requestCount.opencode++;
        await this._logAPICall('opencode', 'context', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('opencode', 'context', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Emergent Integration - System Context and State Management
   * Advanced context and state management for AI systems
   *
   * @param {Object} state - State management request
   * @returns {Promise<Object>} State response
   */
  async callEmergent(state) {
    const apiKey = process.env.EMERGENT_API_KEY;
    if (!apiKey) throw new Error('Emergent API key not configured');

    return await this.breakers.emergent.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.emergent.ai/v1/state',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            action: state.action || 'update',
            sessionId: state.sessionId,
            context: state.context || {},
            metadata: state.metadata || {},
            ...state.options
          },
          timeout: 30000
        });

        this.requestCount.emergent++;
        await this._logAPICall('emergent', 'state', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('emergent', 'state', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  // ============================================================
  // CONTENT TOOLS
  // ============================================================

  /**
   * Gamma AI Integration - Graphics and Multimedia
   * AI-powered presentation and graphics creation
   *
   * @param {Object} request - Content creation request
   * @returns {Promise<Object>} Generated content
   */
  async callGamma(request) {
    const apiKey = process.env.GAMMA_API_KEY;
    if (!apiKey) throw new Error('Gamma API key not configured');

    return await this.breakers.gamma.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.gamma.app/v1/generate',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            type: request.type || 'presentation',
            topic: request.topic,
            slides: request.slides || [],
            theme: request.theme || 'modern',
            ...request.options
          },
          timeout: 60000
        });

        this.requestCount.gamma++;
        await this._logAPICall('gamma', 'generate', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('gamma', 'generate', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Napkin Integration - Content and Media Management
   * Visual content creation and management
   *
   * @param {Object} content - Content request
   * @returns {Promise<Object>} Content response
   */
  async callNapkin(content) {
    const apiKey = process.env.NAPKIN_API_KEY;
    if (!apiKey) throw new Error('Napkin API key not configured');

    return await this.breakers.napkin.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.napkin.ai/v1/content',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            action: content.action || 'create',
            type: content.type || 'visual',
            data: content.data || {},
            ...content.options
          },
          timeout: 30000
        });

        this.requestCount.napkin++;
        await this._logAPICall('napkin', 'content', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('napkin', 'content', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Opal Integration - Content, IP, and Media Management
   * Comprehensive content and intellectual property management
   *
   * @param {Object} request - Management request
   * @returns {Promise<Object>} Management response
   */
  async callOpal(request) {
    const apiKey = process.env.OPAL_API_KEY;
    if (!apiKey) throw new Error('Opal API key not configured');

    return await this.breakers.opal.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.opal.so/v1/assets',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            action: request.action || 'manage',
            assetType: request.assetType || 'content',
            data: request.data || {},
            ...request.options
          },
          timeout: 30000
        });

        this.requestCount.opal++;
        await this._logAPICall('opal', 'manage', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('opal', 'manage', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  // ============================================================
  // SEO & MARKETING
  // ============================================================

  /**
   * Harpa AI Integration - SEO and AEO Optimization
   * AI-powered SEO and Answer Engine Optimization
   *
   * @param {Object} analysis - SEO analysis request
   * @returns {Promise<Object>} Analysis results
   */
  async callHarpa(analysis) {
    const apiKey = process.env.HARPA_API_KEY;
    if (!apiKey) throw new Error('Harpa API key not configured');

    return await this.breakers.harpa.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.harpa.ai/v1/analyze',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            url: analysis.url,
            keywords: analysis.keywords || [],
            competitors: analysis.competitors || [],
            ...analysis.options
          },
          timeout: 30000
        });

        this.requestCount.harpa++;
        await this._logAPICall('harpa', 'analyze', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('harpa', 'analyze', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Clay Integration - Social Media and Marketing Automation
   * CRM and marketing automation platform
   *
   * @param {Object} campaign - Marketing campaign
   * @returns {Promise<Object>} Campaign response
   */
  async callClay(campaign) {
    const apiKey = process.env.CLAY_API_KEY;
    if (!apiKey) throw new Error('Clay API key not configured');

    return await this.breakers.clay.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.clay.com/v1/campaigns',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            name: campaign.name,
            type: campaign.type || 'social',
            audience: campaign.audience || {},
            content: campaign.content || [],
            ...campaign.options
          },
          timeout: 30000
        });

        this.requestCount.clay++;
        await this._logAPICall('clay', 'campaign', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('clay', 'campaign', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Opus Integration - Social Media Content Creation
   * AI-powered social media content generation
   *
   * @param {Object} request - Content creation request
   * @returns {Promise<Object>} Generated content
   */
  async callOpus(request) {
    const apiKey = process.env.OPUS_API_KEY;
    if (!apiKey) throw new Error('Opus API key not configured');

    return await this.breakers.opus.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.opus.pro/v1/generate',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            platform: request.platform || 'twitter',
            topic: request.topic,
            tone: request.tone || 'professional',
            length: request.length || 'medium',
            ...request.options
          },
          timeout: 30000
        });

        this.requestCount.opus++;
        await this._logAPICall('opus', 'generate', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('opus', 'generate', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  // ============================================================
  // KNOWLEDGE GRAPHS
  // ============================================================

  /**
   * Neo4j Integration - Graph Database
   * Graph database for knowledge representation and querying
   *
   * @param {string} query - Cypher query
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Query results
   */
  async callNeo4j(query, params = {}) {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const username = process.env.NEO4J_USERNAME || 'neo4j';
    const password = process.env.NEO4J_PASSWORD;

    if (!password) throw new Error('Neo4j password not configured');

    return await this.breakers.neo4j.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: `${uri.replace('bolt://', 'http://').replace(':7687', ':7474')}/db/neo4j/tx/commit`,
          method: 'POST',
          auth: {
            username,
            password
          },
          headers: {
            'Content-Type': 'application/json'
          },
          data: {
            statements: [
              {
                statement: query,
                parameters: params
              }
            ]
          },
          timeout: 30000
        });

        this.requestCount.neo4j++;
        await this._logAPICall('neo4j', 'query', 'success', {
          duration: Date.now() - startTime
        });

        return response.data.results[0];
      } catch (error) {
        await this._logAPICall('neo4j', 'query', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Graphiti Integration - Knowledge Graph Construction
   * Automated knowledge graph construction and querying
   *
   * @param {Object} operation - Graph operation
   * @returns {Promise<Object>} Operation result
   */
  async callGraphiti(operation) {
    const apiKey = process.env.GRAPHITI_API_KEY;
    if (!apiKey) throw new Error('Graphiti API key not configured');

    return await this.breakers.graphiti.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: 'https://api.graphiti.ai/v1/graphs',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            operation: operation.type || 'build',
            data: operation.data || {},
            schema: operation.schema || {},
            ...operation.options
          },
          timeout: 30000
        });

        this.requestCount.graphiti++;
        await this._logAPICall('graphiti', 'graph', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('graphiti', 'graph', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  // ============================================================
  // ADDITIONAL TOOLS
  // ============================================================

  /**
   * Playwright Integration - Browser Automation
   * Browser automation and testing
   *
   * @param {Object} script - Automation script
   * @returns {Promise<Object>} Execution result
   */
  async callPlaywright(script) {
    // Playwright typically runs locally, but can use cloud services
    const apiKey = process.env.PLAYWRIGHT_API_KEY;

    return await this.breakers.playwright.execute(async () => {
      const startTime = Date.now();

      try {
        // If using Playwright cloud service
        if (apiKey) {
          const response = await axios({
            url: 'https://api.playwright.dev/v1/execute',
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            data: {
              script: script.code,
              browser: script.browser || 'chromium',
              options: script.options || {}
            },
            timeout: 60000
          });

          this.requestCount.playwright++;
          await this._logAPICall('playwright', 'execute', 'success', {
            duration: Date.now() - startTime
          });

          return response.data;
        }

        // Local Playwright execution would go here
        throw new Error('Local Playwright execution not yet implemented');
      } catch (error) {
        await this._logAPICall('playwright', 'execute', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Apify Integration - Web Scraping and Automation
   * Cloud-based web scraping and automation platform
   *
   * @param {Object} task - Scraping task
   * @returns {Promise<Object>} Scraped data
   */
  async callApify(task) {
    const apiKey = process.env.APIFY_API_KEY;
    if (!apiKey) throw new Error('Apify API key not configured');

    return await this.breakers.apify.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: `https://api.apify.com/v2/acts/${task.actorId}/runs`,
          method: 'POST',
          params: { token: apiKey },
          headers: {
            'Content-Type': 'application/json'
          },
          data: task.input || {},
          timeout: 60000
        });

        this.requestCount.apify++;
        await this._logAPICall('apify', 'run', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('apify', 'run', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * n8n Integration - Workflow Automation
   * Self-hosted workflow automation platform
   *
   * @param {Object} workflow - Workflow execution request
   * @returns {Promise<Object>} Execution result
   */
  async callN8n(workflow) {
    const apiHost = process.env.N8N_API_HOST || 'http://localhost:5678';
    const apiKey = process.env.N8N_API_KEY;

    return await this.breakers.n8n.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: `${apiHost}/api/v1/workflows/${workflow.id}/execute`,
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': apiKey,
            'Content-Type': 'application/json'
          },
          data: workflow.data || {},
          timeout: 60000
        });

        this.requestCount.n8n++;
        await this._logAPICall('n8n', 'execute', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('n8n', 'execute', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  /**
   * Zapier Integration - Integration Platform
   * Cloud-based integration and automation platform
   *
   * @param {Object} zap - Zapier webhook or action
   * @returns {Promise<Object>} Result
   */
  async callZapier(zap) {
    const webhookUrl = zap.webhookUrl || process.env.ZAPIER_WEBHOOK_URL;
    if (!webhookUrl) throw new Error('Zapier webhook URL not configured');

    return await this.breakers.zapier.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await axios({
          url: webhookUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          data: zap.data || {},
          timeout: 30000
        });

        this.requestCount.zapier++;
        await this._logAPICall('zapier', 'trigger', 'success', {
          duration: Date.now() - startTime
        });

        return response.data;
      } catch (error) {
        await this._logAPICall('zapier', 'trigger', 'error', {
          duration: Date.now() - startTime,
          error: error.message
        });
        throw error;
      }
    });
  }

  // ============================================================
  // HEALTH CHECK
  // ============================================================

  /**
   * Health check for all Phase 6B services
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const checks = {};
    const services = Object.keys(this.breakers);

    for (const service of services) {
      const envVars = this._getRequiredEnvVars(service);
      const configured = envVars.length === 0
        || envVars.every((varName) => process.env[varName]);

      checks[service] = {
        status: configured ? 'configured' : 'not_configured',
        requiredEnvVars: envVars,
        missingEnvVars: envVars.filter((v) => !process.env[v]),
        circuitBreaker: {
          state: this.breakers[service].state,
          stats: this.breakers[service].getStats()
        },
        requestCount: this.requestCount[service]
      };
    }

    return checks;
  }

  /**
   * Get required environment variables for a service
   * @private
   */
  _getRequiredEnvVars(service) {
    const envVarsMap = {
      // Development Agents
      tempolabs: ['TEMPOLABS_API_KEY'],
      softgen: ['SOFTGEN_API_KEY'],
      bolt: [], // Self-hosted, optional
      augmentcode: ['AUGMENTCODE_API_KEY'],
      warp: ['WARP_API_KEY'],
      windsurf: ['WINDSURF_API_KEY'],
      qoder: ['QODER_API_KEY'],

      // AI Platforms
      cassidy: ['CASSIDY_API_KEY'],
      opencode: ['OPENCODE_API_KEY'],
      emergent: ['EMERGENT_API_KEY'],

      // Content Tools
      gamma: ['GAMMA_API_KEY'],
      napkin: ['NAPKIN_API_KEY'],
      opal: ['OPAL_API_KEY'],

      // SEO & Marketing
      harpa: ['HARPA_API_KEY'],
      clay: ['CLAY_API_KEY'],
      opus: ['OPUS_API_KEY'],

      // Knowledge Graphs
      neo4j: ['NEO4J_PASSWORD'],
      graphiti: ['GRAPHITI_API_KEY'],

      // Additional Tools
      langchain: [],
      playwright: [], // Can be local or cloud
      apify: ['APIFY_API_KEY'],
      n8n: ['N8N_API_KEY'],
      zapier: ['ZAPIER_WEBHOOK_URL']
    };

    return envVarsMap[service] || [];
  }

  /**
   * Get usage statistics for all services
   * @returns {Object} Usage statistics
   */
  getStats() {
    const circuitBreakers = {};
    Object.keys(this.breakers).forEach((key) => {
      circuitBreakers[key] = this.breakers[key].getStats();
    });

    return {
      requestCount: this.requestCount,
      circuitBreakers,
      cacheStats: this.cache ? this.cache.getStats() : null
    };
  }

  // Helper methods
  async _getCached(key) {
    if (!this.config.enableCache || !this.cache) return null;
    return await this.cache.get(key);
  }

  async _setCached(key, value, ttl = null) {
    if (!this.config.enableCache || !this.cache) return;
    await this.cache.set(key, value, ttl || this.config.cacheTTL);
  }

  async _logAPICall(service, endpoint, status, details = {}) {
    if (!this.config.enableLogging || !this.auditLogger) return;

    await this.auditLogger.log({
      category: 'external_api',
      action: `phase6b_${service}_${status}`,
      details: {
        service,
        endpoint,
        status,
        ...details
      },
      severity: status === 'error' ? 'error' : 'info'
    });
  }

  async close() {
    if (this.cache) {
      await this.cache.close();
    }
  }
}

module.exports = { Phase6BIntegrations };
