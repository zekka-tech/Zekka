require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createLogger, format, transports } = require('winston');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const ContextBus = require('./shared/context-bus');
const TokenEconomics = require('./shared/token-economics');
const ZekkaOrchestrator = require('./orchestrator/orchestrator');
const { initVault } = require('./config/vault');

// Middleware
const { apiLimiter, createProjectLimiter, authLimiter } = require('./middleware/rateLimit');
const { authenticate, optionalAuth, register, login, getUser } = require('./middleware/auth');
const { metricsMiddleware, getMetrics, trackProject, trackAgent, trackCost } = require('./middleware/metrics');
const websocket = require('./middleware/websocket');
const { csrfTokenGenerator, csrfTokenValidator } = require('./middleware/csrf');

// API Routes
const projectsRoutes = require('./routes/projects.routes');
const conversationsRoutes = require('./routes/conversations.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const agentsRoutes = require('./routes/agents.routes');
const sourcesRoutes = require('./routes/sources.routes');
const preferencesRoutes = require('./routes/preferences.routes');

// Logger setup
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

// Initialize app and HTTP server
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(metricsMiddleware);

// CSRF Protection
app.use(csrfTokenGenerator); // Generate CSRF tokens
// CSRF validation for state-changing requests (applied to API routes below)

// Initialize core services
let contextBus, tokenEconomics, orchestrator, vault;

async function initializeServices() {
  try {
    logger.info('🚀 Initializing Zekka Framework services...');

    // Initialize WebSocket
    websocket.initializeWebSocket(server, logger);

    // Initialize Vault (if enabled)
    try {
      vault = await initVault(logger);
      if (vault) {
        logger.info('✅ Vault service ready');
      }
    } catch (vaultError) {
      logger.warn('⚠️  Vault initialization failed, using environment variables:', vaultError.message);
    }

    // Initialize Context Bus (Redis) with password authentication
    contextBus = new ContextBus({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || ''
    });
    await contextBus.connect();
    logger.info('✅ Context Bus connected');
    
    // Initialize Token Economics
    tokenEconomics = new TokenEconomics({
      dailyBudget: parseFloat(process.env.DAILY_BUDGET) || 50,
      monthlyBudget: parseFloat(process.env.MONTHLY_BUDGET) || 1000,
      contextBus
    });
    logger.info('✅ Token Economics initialized');
    
    // Initialize Orchestrator
    orchestrator = new ZekkaOrchestrator({
      contextBus,
      tokenEconomics,
      logger,
      config: {
        githubToken: process.env.GITHUB_TOKEN,
        anthropicKey: process.env.ANTHROPIC_API_KEY,
        openaiKey: process.env.OPENAI_API_KEY,
        ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
        maxConcurrentAgents: parseInt(process.env.MAX_CONCURRENT_AGENTS) || 10,
        defaultModel: process.env.DEFAULT_MODEL || 'ollama'
      }
    });
    await orchestrator.initialize();
    logger.info('✅ Orchestrator initialized');
    
    logger.info('🎉 All services initialized successfully!');
  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

// Swagger API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Prometheus Metrics
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    logger.error('Error fetching Prometheus metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: System health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *       503:
 *         description: System is unhealthy
 */
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      contextBus: contextBus?.isConnected() || false,
      orchestrator: orchestrator?.isReady() || false
    }
  };
  
  const allHealthy = Object.values(health.services).every(s => s === true);
  const statusCode = allHealthy ? 200 : 503;
  
  res.status(statusCode).json(health);
});

// API Routes

// Authentication routes
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 */
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const user = await register(email, password, name);
    logger.info(`👤 User registered: ${email}`);
    res.status(201).json(user);
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    
    const result = await login(email, password);
    logger.info(`👤 User logged in: ${email}`);
    res.json(result);
  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information
 *       401:
 *         description: Unauthorized
 */
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = getUser(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new project
/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create new project
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - requirements
 *             properties:
 *               name:
 *                 type: string
 *               requirements:
 *                 type: array
 *                 items:
 *                   type: string
 *               storyPoints:
 *                 type: integer
 *               budget:
 *                 type: object
 *     responses:
 *       201:
 *         description: Project created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 */
app.post('/api/projects', apiLimiter, createProjectLimiter, optionalAuth, async (req, res) => {
  try {
    const { name, requirements, storyPoints, budget } = req.body;
    
    if (!name || !requirements || !Array.isArray(requirements)) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, requirements (array)' 
      });
    }
    
    const project = await orchestrator.createProject({
      name,
      requirements,
      storyPoints: storyPoints || 8,
      budget: budget || {
        daily: parseFloat(process.env.DAILY_BUDGET) || 50,
        monthly: parseFloat(process.env.MONTHLY_BUDGET) || 1000
      },
      userId: req.user?.userId
    });
    
    trackProject('started', 'pending');
    websocket.broadcastProjectUpdate(project.projectId, {
      status: 'created',
      name: project.name
    });
    
    logger.info(`📋 Project created: ${project.projectId}`);
    res.status(201).json(project);
  } catch (error) {
    logger.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute project workflow
/**
 * @swagger
 * /api/projects/{projectId}/execute:
 *   post:
 *     summary: Execute project workflow
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Execution started
 */
app.post('/api/projects/:projectId/execute', apiLimiter, optionalAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    logger.info(`🚀 Starting execution for project: ${projectId}`);
    
    // Start execution asynchronously
    orchestrator.executeProject(projectId)
      .then(result => {
        logger.info(`✅ Project completed: ${projectId}`, result);
      })
      .catch(error => {
        logger.error(`❌ Project failed: ${projectId}`, error);
      });
    
    res.json({ 
      message: 'Execution started',
      projectId,
      status: 'running'
    });
  } catch (error) {
    logger.error('Error starting execution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get project status
/**
 * @swagger
 * /api/projects/{projectId}:
 *   get:
 *     summary: Get project status
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 */
app.get('/api/projects/:projectId', apiLimiter, optionalAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await orchestrator.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    logger.error('Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all projects
/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: List all projects
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: List of projects
 */
app.get('/api/projects', apiLimiter, optionalAuth, async (req, res) => {
  try {
    const projects = await orchestrator.listProjects();
    res.json(projects);
  } catch (error) {
    logger.error('Error listing projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get cost summary
/**
 * @swagger
 * /api/costs:
 *   get:
 *     summary: Get cost summary
 *     tags: [Costs]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *     responses:
 *       200:
 *         description: Cost summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CostSummary'
 */
app.get('/api/costs', apiLimiter, optionalAuth, async (req, res) => {
  try {
    const { projectId, period } = req.query;
    const costs = await tokenEconomics.getCostSummary(projectId, period);
    res.json(costs);
  } catch (error) {
    logger.error('Error fetching costs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get system metrics
/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Get system metrics
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: System metrics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Metrics'
 */
app.get('/api/metrics', apiLimiter, optionalAuth, async (req, res) => {
  try {
    const metrics = await orchestrator.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Register API v1 routes (Team 3 - Core Services)
app.use('/api/v1/projects', projectsRoutes);
app.use('/api/v1/conversations', conversationsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/agents', agentsRoutes);
app.use('/api/v1/sources', sourcesRoutes);
app.use('/api/v1/preferences', preferencesRoutes);

// Serve static files (frontend)
app.use(express.static('public'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');

  if (vault) {
    const { shutdownVault } = require('./config/vault');
    await shutdownVault();
  }
  if (contextBus) await contextBus.disconnect();
  if (orchestrator) await orchestrator.shutdown();

  process.exit(0);
});

// Start server
async function start() {
  await initializeServices();
  
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🌐 Zekka Framework listening on http://0.0.0.0:${PORT}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    logger.info(`📚 API docs: http://localhost:${PORT}/api/docs`);
    logger.info(`📈 Prometheus metrics: http://localhost:${PORT}/metrics`);
    logger.info(`🔌 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  });
}

start().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
