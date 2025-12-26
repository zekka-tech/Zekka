require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createLogger, format, transports } = require('winston');

const ContextBus = require('./shared/context-bus');
const TokenEconomics = require('./shared/token-economics');
const ZekkaOrchestrator = require('./orchestrator/orchestrator');

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

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Initialize core services
let contextBus, tokenEconomics, orchestrator;

async function initializeServices() {
  try {
    logger.info('🚀 Initializing Zekka Framework services...');
    
    // Initialize Context Bus (Redis)
    contextBus = new ContextBus({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379
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

// Health check endpoint
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

// Create new project
app.post('/api/projects', async (req, res) => {
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
      }
    });
    
    logger.info(`📋 Project created: ${project.projectId}`);
    res.status(201).json(project);
  } catch (error) {
    logger.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute project workflow
app.post('/api/projects/:projectId/execute', async (req, res) => {
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
app.get('/api/projects/:projectId', async (req, res) => {
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
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await orchestrator.listProjects();
    res.json(projects);
  } catch (error) {
    logger.error('Error listing projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get cost summary
app.get('/api/costs', async (req, res) => {
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
app.get('/api/metrics', async (req, res) => {
  try {
    const metrics = await orchestrator.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

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
  
  if (contextBus) await contextBus.disconnect();
  if (orchestrator) await orchestrator.shutdown();
  
  process.exit(0);
});

// Start server
async function start() {
  await initializeServices();
  
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🌐 Zekka Framework listening on http://0.0.0.0:${PORT}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    logger.info(`📚 API docs: http://localhost:${PORT}/api/docs`);
  });
}

start().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
