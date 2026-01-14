/**
 * Zekka Framework - Secure Main Server
 * Version: 2.0.0-secure
 * 
 * SECURITY ENHANCEMENTS:
 * - Environment variable validation on startup
 * - Database-backed user authentication
 * - Input sanitization and validation
 * - CSRF protection
 * - Enhanced security headers
 * - Circuit breakers for external services
 * - Comprehensive error handling
 * - Audit logging
 * - Request ID tracking
 * - Response compression
 */

// Load and validate configuration FIRST
const config = require('./config');
const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const addRequestId = require('express-request-id')();

// Initialize logger from config
const logger = config.logger;

// Import middleware
const { securityMiddleware } = require('./middleware/security.middleware');
const { csrfProtection, csrfErrorHandler } = require('./middleware/csrf.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const { apiLimiter } = require('./middleware/rateLimit.enhanced');

// Import repositories and services
const userRepository = require('./repositories/user.repository');
const {
  authenticate,
  optionalAuth,
  register,
  login,
  getUser
} = require('./middleware/auth.secure');

// Import core services
const ContextBus = require('./shared/context-bus');
const TokenEconomics = require('./shared/token-economics');
const ZekkaOrchestrator = require('./orchestrator/orchestrator');
const { metricsMiddleware, getMetrics } = require('./middleware/metrics');
const websocket = require('./middleware/websocket');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Trust proxy (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ============================================================================
// PHASE 1: SECURITY MIDDLEWARE (Applied FIRST)
// ============================================================================

// 1. Request ID tracking (for audit logging)
app.use(addRequestId);

// 2. Security headers, compression, rate limiting
app.use(securityMiddleware);

// 3. Cookie parser (required for CSRF)
app.use(cookieParser(config.sessionSecret));

// 4. Body parsing with size limits
app.use(express.json({ limit: '10mb' })); // Reduced from 50mb
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. CSRF protection (after body parsing, before routes)
app.use(csrfProtection);

// 6. Metrics tracking
app.use(metricsMiddleware);

// 7. Request logging with request ID
app.use((req, res, next) => {
  logger.info({
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// ============================================================================
// CORE SERVICES INITIALIZATION
// ============================================================================

let contextBus, tokenEconomics, orchestrator;

async function initializeServices() {
  try {
    logger.info('🚀 Initializing Zekka Framework services...');
    
    // Initialize database connection
    const db = require('./config/database');
    await db.pool.query('SELECT NOW()');
    logger.info('✅ Database connected');
    
    // Initialize database schema
    await userRepository.initializeDatabase();
    logger.info('✅ User repository initialized');
    
    // Initialize WebSocket
    websocket.initializeWebSocket(server, logger);
    logger.info('✅ WebSocket initialized');
    
    // Initialize Context Bus (Redis)
    contextBus = new ContextBus({
      host: config.redis.host,
      port: config.redis.port
    });
    await contextBus.connect();
    logger.info('✅ Context Bus connected');
    
    // Initialize Token Economics
    tokenEconomics = new TokenEconomics({
      dailyBudget: config.budgets.daily,
      monthlyBudget: config.budgets.monthly,
      contextBus
    });
    logger.info('✅ Token Economics initialized');
    
    // Initialize Orchestrator with circuit breakers
    orchestrator = new ZekkaOrchestrator({
      contextBus,
      tokenEconomics,
      logger,
      config: {
        githubToken: config.apiKeys.github,
        anthropicKey: config.apiKeys.anthropic,
        openaiKey: config.apiKeys.openai,
        ollamaHost: config.ollama.host,
        maxConcurrentAgents: config.orchestrator.maxConcurrentAgents,
        defaultModel: config.orchestrator.defaultModel
      }
    });
    await orchestrator.initialize();
    logger.info('✅ Orchestrator initialized');
    
    logger.info('🎉 All services initialized successfully!');
    return true;
  } catch (error) {
    logger.error('❌ Failed to initialize services:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// ============================================================================
// HEALTH CHECK & METRICS (No authentication required)
// ============================================================================

app.get('/health', async (req, res) => {
  try {
    const db = require('./config/database');
    await db.pool.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: 'connected',
        redis: contextBus ? 'connected' : 'disconnected',
        orchestrator: orchestrator ? 'ready' : 'initializing'
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Service unavailable'
    });
  }
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(getMetrics());
});

// ============================================================================
// API DOCUMENTATION
// ============================================================================

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================================================
// AUTHENTICATION ROUTES (Rate limited)
// ============================================================================

const authRouter = express.Router();
authRouter.use(apiLimiter);

// CSRF token endpoint
authRouter.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Register new user
authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    
    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'name']
      });
    }
    
    const result = await register(email, password, name);
    
    logger.info({
      requestId: req.id,
      action: 'user_registered',
      userId: result.user.id,
      email: result.user.email
    });
    
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Login
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        required: ['email', 'password']
      });
    }
    
    const result = await login(email, password);
    
    logger.info({
      requestId: req.id,
      action: 'user_login',
      userId: result.user.id,
      email: result.user.email
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get current user
authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await getUser(req.user.userId);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRouter);

// ============================================================================
// PROJECT ROUTES (Protected)
// ============================================================================

const projectRouter = express.Router();
projectRouter.use(authenticate);
projectRouter.use(apiLimiter);

// Create project
projectRouter.post('/', async (req, res, next) => {
  try {
    const { name, requirements, storyPoints, budget } = req.body;
    
    if (!name || !requirements || !Array.isArray(requirements)) {
      return res.status(400).json({
        error: 'Invalid project data',
        required: {
          name: 'string',
          requirements: 'array',
          storyPoints: 'number (optional)',
          budget: 'number (optional)'
        }
      });
    }
    
    const project = await orchestrator.createProject({
      name,
      requirements,
      storyPoints: storyPoints || 0,
      budget: budget || 0,
      userId: req.user.userId
    });
    
    logger.info({
      requestId: req.id,
      action: 'project_created',
      projectId: project.id,
      userId: req.user.userId
    });
    
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

// Execute project
projectRouter.post('/:projectId/execute', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    // Start execution asynchronously
    orchestrator.executeProject(projectId).catch(error => {
      logger.error({
        requestId: req.id,
        action: 'project_execution_failed',
        projectId,
        error: error.message
      });
    });
    
    logger.info({
      requestId: req.id,
      action: 'project_execution_started',
      projectId,
      userId: req.user.userId
    });
    
    res.json({
      message: 'Project execution started',
      projectId
    });
  } catch (error) {
    next(error);
  }
});

// Get project
projectRouter.get('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await orchestrator.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

// List projects
projectRouter.get('/', async (req, res, next) => {
  try {
    const projects = await orchestrator.listProjects();
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

app.use('/api/projects', projectRouter);

// ============================================================================
// COST TRACKING ROUTES
// ============================================================================

const costRouter = express.Router();
costRouter.use(authenticate);
costRouter.use(apiLimiter);

costRouter.get('/', async (req, res, next) => {
  try {
    const costs = await tokenEconomics.getTotalCosts();
    res.json({ costs });
  } catch (error) {
    next(error);
  }
});

costRouter.get('/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const costs = await tokenEconomics.getProjectCosts(projectId);
    res.json({ projectId, costs });
  } catch (error) {
    next(error);
  }
});

app.use('/api/costs', costRouter);

// ============================================================================
// ERROR HANDLING (Must be last)
// ============================================================================

app.use(csrfErrorHandler);
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Initialize services first
    await initializeServices();
    
    // Start HTTP server
    server.listen(config.port, config.host, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🚀 ZEKKA FRAMEWORK v2.0.0 (SECURE)                          ║
║                                                                ║
║   Server:        http://${config.host}:${config.port.toString().padEnd(34)}║
║   Environment:   ${config.nodeEnv.padEnd(44)}║
║   API Docs:      http://${config.host}:${config.port}/api-docs${' '.repeat(21)}║
║   Metrics:       http://${config.host}:${config.port}/metrics${' '.repeat(23)}║
║                                                                ║
║   Security:      ✅ ENHANCED                                   ║
║   - JWT Auth     ✅ Database-backed                            ║
║   - CSRF         ✅ Enabled                                    ║
║   - Validation   ✅ Input sanitization                         ║
║   - Headers      ✅ Helmet + Custom                            ║
║   - Rate Limit   ✅ Redis-backed                               ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
      `);
    });
    
    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          if (contextBus) {
            await contextBus.disconnect();
            logger.info('Context Bus disconnected');
          }
          
          const db = require('./config/database');
          await db.pool.end();
          logger.info('Database pool closed');
          
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { app, server, startServer };
