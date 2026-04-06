require('dotenv').config();
const express = require('express');
const fs = require('fs');
const http = require('http');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const RedisStoreFactory = require('connect-redis');
const helmet = require('helmet');
const morgan = require('morgan');
const { createLogger, format, transports } = require('winston');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const redisClient = require('./config/redis');
const config = require('./config');
const { healthCheck: databaseHealthCheck } = require('./config/database');
const { healthCheck: redisHealthCheck, closeRedis } = require('./config/redis');
const { initVault, shutdownVault } = require('./config/vault');

const ContextBus = require('./shared/context-bus');
const TokenEconomics = require('./shared/token-economics');
const ZekkaOrchestrator = require('./orchestrator/orchestrator');

// Middleware
const {
  apiLimiter,
  createProjectLimiter
} = require('./middleware/rateLimit');
const {
  optionalAuth
} = require('./middleware/auth');
const {
  metricsMiddleware,
  getMetrics,
  trackProject
} = require('./middleware/metrics');

const websocket = require('./middleware/websocket');
const { csrfTokenGenerator, csrfTokenValidator } = require('./middleware/csrf');
const { createCsrfRouteGuard } = require('./middleware/csrf-route-guard');

const RedisStore = RedisStoreFactory(session);

// API Routes
const projectsRoutes = require('./routes/projects.routes');
const conversationsRoutes = require('./routes/conversations.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const agentsRoutes = require('./routes/agents.routes');
const sourcesRoutes = require('./routes/sources.routes');
const preferencesRoutes = require('./routes/preferences.routes');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');

// Logger setup
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    })
  ]
});

// Initialize app and HTTP server
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error('SESSION_SECRET is required for CSRF session protection');
}

const sessionStore = new RedisStore({
  client: redisClient,
  prefix: 'zekka:session:'
});

// Middleware
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (config.cors.origins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));
app.use(
  session({
    store: sessionStore,
    name: 'zekka.sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: parseInt(process.env.SESSION_TIMEOUT, 10) || 60 * 60 * 1000,
      path: '/api'
    }
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } })
);
app.use(metricsMiddleware);

// CSRF Protection
app.use('/api', csrfTokenGenerator); // Generate CSRF tokens for API requests
app.use('/api', createCsrfRouteGuard(csrfTokenValidator));

// Initialize core services
let contextBus;
let tokenEconomics;
let orchestrator;
let vault;
let isShuttingDown = false;

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
      if (process.env.NODE_ENV === 'production' && process.env.VAULT_ENABLED === 'true') {
        throw vaultError;
      }

      logger.warn(
        '⚠️  Vault initialization failed, using environment variables:',
        vaultError.message
      );
    }

    // Initialize Context Bus (Redis) with password authentication
    contextBus = new ContextBus({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
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
        maxConcurrentAgents: parseInt(process.env.MAX_CONCURRENT_AGENTS, 10) || 10,
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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.get('/api/csrf-token', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ csrfToken: res.locals.csrfToken });
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

function buildHealthPayload(checks) {
  const allHealthy = Object.values(checks).every((service) => service === true);

  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: checks
  };
}

async function respondWithHealth(res, checksPromise) {
  if (isShuttingDown) {
    return res.status(503).json({
      status: 'shutting_down',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        shutdown: false
      }
    });
  }

  const checks = await checksPromise;
  const health = buildHealthPayload(checks);
  return res.status(health.status === 'healthy' ? 200 : 503).json(health);
}

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
app.get('/livez', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/readyz', async (_req, res) => {
  await respondWithHealth(res, Promise.all([
    databaseHealthCheck(),
    redisHealthCheck()
  ]).then(([database, redis]) => ({
    database,
    redis,
    contextBus: contextBus?.isConnected() || false,
    orchestrator: orchestrator?.isReady() || false
  })));
});

app.get('/health', async (_req, res) => {
  await respondWithHealth(res, Promise.resolve({
    contextBus: contextBus?.isConnected() || false,
    orchestrator: orchestrator?.isReady() || false
  }));
});

app.get('/api/health', async (_req, res) => {
  await respondWithHealth(res, Promise.resolve({
    contextBus: contextBus?.isConnected() || false,
    orchestrator: orchestrator?.isReady() || false
  }));
});

// API Routes

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

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
app.post(
  '/api/projects',
  apiLimiter,
  createProjectLimiter,
  optionalAuth,
  async (req, res) => {
    try {
      const {
        name, requirements, storyPoints, budget
      } = req.body;

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
  }
);

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
app.post(
  '/api/projects/:projectId/execute',
  apiLimiter,
  optionalAuth,
  async (req, res) => {
    try {
      const { projectId } = req.params;

      logger.info(`🚀 Starting execution for project: ${projectId}`);

      // Start execution asynchronously
      orchestrator
        .executeProject(projectId)
        .then((result) => {
          logger.info(`✅ Project completed: ${projectId}`, result);
        })
        .catch((error) => {
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
  }
);

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
app.get(
  '/api/projects/:projectId',
  apiLimiter,
  optionalAuth,
  async (req, res) => {
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
  }
);

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

const frontendBuildDir = path.join(__dirname, '../frontend/dist');
const legacyPublicDir = path.join(__dirname, '../public');
const primaryWebDir = fs.existsSync(path.join(frontendBuildDir, 'index.html'))
  ? frontendBuildDir
  : legacyPublicDir;

app.use(express.static(primaryWebDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(primaryWebDir, 'index.html'));
});

app.get(/^\/(?!api|metrics).*/, (req, res, next) => {
  const indexFile = path.join(primaryWebDir, 'index.html');
  if (!fs.existsSync(indexFile)) {
    return next();
  }

  return res.sendFile(indexFile);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, _next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully...`);

  const timeoutMs = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10);
  const forceExit = setTimeout(() => {
    logger.error(`Graceful shutdown timed out after ${timeoutMs}ms`);
    process.exit(1);
  }, timeoutMs);

  try {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    if (vault) {
      await shutdownVault();
    }
    if (contextBus) await contextBus.disconnect();
    if (orchestrator) await orchestrator.shutdown();
    await closeRedis();

    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExit);
    logger.error('Graceful shutdown failed:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

// Start server
async function start() {
  await initializeServices();

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🌐 Zekka Framework listening on http://0.0.0.0:${PORT}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    logger.info(`📊 Compatibility health check: http://localhost:${PORT}/api/health`);
    logger.info(`📚 API docs: http://localhost:${PORT}/api/docs`);
    logger.info(`📚 Compatibility API docs: http://localhost:${PORT}/api-docs`);
    logger.info(`📈 Prometheus metrics: http://localhost:${PORT}/metrics`);
    logger.info(`🔌 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  });
}

start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
