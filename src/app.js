require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const { RedisStore } = require("connect-redis");
const helmet = require("helmet");
const morgan = require("morgan");
const { createLogger, format, transports } = require("winston");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const redisClient = require("./config/redis");
const config = require("./config");

// Middleware
const { apiLimiter, createProjectLimiter } = require("./middleware/rateLimit");
const { authenticate, optionalAuth } = require("./middleware/auth");
const {
  metricsMiddleware,
  getMetrics,
  trackProject,
} = require("./middleware/metrics");
const { csrfTokenGenerator, csrfTokenValidator } = require("./middleware/csrf");
const { createCsrfRouteGuard } = require("./middleware/csrf-route-guard");
// API Routes
const projectsRoutes = require("./routes/projects.routes");
const conversationsRoutes = require("./routes/conversations.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const agentsRoutes = require("./routes/agents.routes");
const sourcesRoutes = require("./routes/sources.routes");
const preferencesRoutes = require("./routes/preferences.routes");
const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");

// Logger setup
const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.File({ filename: "logs/error.log", level: "error" }),
    new transports.File({ filename: "logs/combined.log" }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error("SESSION_SECRET is required for CSRF session protection");
}

// In test environment use the default in-process MemoryStore so that supertest
// requests don't attempt to talk to a real Redis instance.
const sessionStore =
  process.env.NODE_ENV !== "test"
    ? new RedisStore({
        client: redisClient,
        prefix: "zekka:session:",
      })
    : undefined; // express-session falls back to MemoryStore when undefined

// Idempotency middleware for write endpoints
const { idempotency } = require("./middleware/idempotency");

// Service references — populated by index.js via setServices() after init
let contextBus;
let tokenEconomics;
let orchestrator;

/**
 * Called by index.js after services are initialized so that inline route
 * handlers (health, costs, metrics, projects) can reference live instances.
 */
function setServices(services) {
  contextBus = services.contextBus;
  tokenEconomics = services.tokenEconomics;
  orchestrator = services.orchestrator;
}

const app = express();

// Middleware
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (config.cors.origins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(
  session({
    store: sessionStore,
    name: "zekka.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: parseInt(process.env.SESSION_TIMEOUT, 10) || 60 * 60 * 1000,
      path: "/api",
    },
  }),
);
app.use(express.json({ limit: config.limits.json }));
app.use(express.urlencoded({ extended: true, limit: config.limits.urlEncoded }));
app.use(
  morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }),
);
app.use(metricsMiddleware);

// CSRF Protection
app.use("/api", csrfTokenGenerator); // Generate CSRF tokens for API requests
app.use("/api", createCsrfRouteGuard(csrfTokenValidator));

// Swagger API Documentation
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.get("/api/csrf-token", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ csrfToken: res.locals.csrfToken });
});

// Prometheus Metrics
app.get("/metrics", async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.set("Content-Type", "text/plain");
    res.send(metrics);
  } catch (error) {
    logger.error("Error fetching Prometheus metrics:", error);
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
app.get("/health", (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      contextBus: contextBus?.isConnected() || false,
      orchestrator: orchestrator?.isReady() || false,
    },
  };

  const allHealthy = Object.values(health.services).every((s) => s === true);
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json(health);
});
app.get("/api/health", (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      contextBus: contextBus?.isConnected() || false,
      orchestrator: orchestrator?.isReady() || false,
    },
  };

  const allHealthy = Object.values(health.services).every((s) => s === true);
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json(health);
});

// API Routes

app.use("/api/auth", authRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/users", usersRoutes);

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
  "/api/projects",
  apiLimiter,
  createProjectLimiter,
  optionalAuth,
  idempotency(),
  async (req, res) => {
    try {
      const { name, requirements, storyPoints, budget } = req.body;

      if (!name || !requirements || !Array.isArray(requirements)) {
        return res.status(400).json({
          error: "Missing required fields: name, requirements (array)",
        });
      }

      const project = await orchestrator.createProject({
        name,
        requirements,
        storyPoints: storyPoints || 8,
        budget: budget || {
          daily: parseFloat(process.env.DAILY_BUDGET) || 50,
          monthly: parseFloat(process.env.MONTHLY_BUDGET) || 1000,
        },
        userId: req.user?.userId,
      });

      trackProject("started", "pending");

      const websocket = require("./middleware/websocket");
      websocket.broadcastProjectUpdate(project.projectId, {
        status: "created",
        name: project.name,
      });

      logger.info(`Project created: ${project.projectId}`);
      res.status(201).json(project);
    } catch (error) {
      logger.error("Error creating project:", error);
      res.status(500).json({ error: error.message });
    }
  },
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
  "/api/projects/:projectId/execute",
  apiLimiter,
  optionalAuth,
  async (req, res) => {
    try {
      const { projectId } = req.params;

      logger.info(`Starting execution for project: ${projectId}`);

      // Start execution asynchronously
      orchestrator
        .executeProject(projectId)
        .then((result) => {
          logger.info(`Project completed: ${projectId}`, result);
        })
        .catch((error) => {
          logger.error(`Project failed: ${projectId}`, error);
        });

      res.json({
        message: "Execution started",
        projectId,
        status: "running",
      });
    } catch (error) {
      logger.error("Error starting execution:", error);
      res.status(500).json({ error: error.message });
    }
  },
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
  "/api/projects/:projectId",
  apiLimiter,
  optionalAuth,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const project = await orchestrator.getProject(projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      logger.error("Error fetching project:", error);
      res.status(500).json({ error: error.message });
    }
  },
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
app.get("/api/projects", apiLimiter, optionalAuth, async (req, res) => {
  try {
    const projects = await orchestrator.listProjects();
    res.json(projects);
  } catch (error) {
    logger.error("Error listing projects:", error);
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
app.get("/api/costs", apiLimiter, optionalAuth, async (req, res) => {
  try {
    const { projectId, period } = req.query;
    const costs = await tokenEconomics.getCostSummary(projectId, period);
    res.json(costs);
  } catch (error) {
    logger.error("Error fetching costs:", error);
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
app.get("/api/metrics", apiLimiter, optionalAuth, async (req, res) => {
  try {
    const metrics = await orchestrator.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error("Error fetching metrics:", error);
    res.status(500).json({ error: error.message });
  }
});

// Register API v1 routes (Team 3 - Core Services)
app.use("/api/v1/projects", projectsRoutes);
app.use("/api/v1/conversations", conversationsRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/agents", agentsRoutes);
app.use("/api/v1/sources", sourcesRoutes);
app.use("/api/v1/preferences", preferencesRoutes);

const frontendBuildDir = path.join(__dirname, "../frontend/dist");
const legacyPublicDir = path.join(__dirname, "../public");
const primaryWebDir = fs.existsSync(path.join(frontendBuildDir, "index.html"))
  ? frontendBuildDir
  : legacyPublicDir;

app.use(express.static(primaryWebDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(primaryWebDir, "index.html"));
});

app.get(/^\/(?!api|metrics).*/, (req, res, next) => {
  const indexFile = path.join(primaryWebDir, "index.html");
  if (!fs.existsSync(indexFile)) {
    return next();
  }

  return res.sendFile(indexFile);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

module.exports = app;
module.exports.setServices = setServices;
module.exports.logger = logger;
