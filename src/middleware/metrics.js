/**
 * Prometheus Metrics Middleware
 * Collects and exposes system metrics for monitoring
 */

const promClient = require('prom-client');

// Create a Registry to register metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeProjects = new promClient.Gauge({
  name: 'zekka_active_projects',
  help: 'Number of currently active projects'
});

const activeAgents = new promClient.Gauge({
  name: 'zekka_active_agents',
  help: 'Number of currently active AI agents'
});

const projectsCompleted = new promClient.Counter({
  name: 'zekka_projects_completed_total',
  help: 'Total number of completed projects',
  labelNames: ['status']
});

const agentExecutionTime = new promClient.Histogram({
  name: 'zekka_agent_execution_seconds',
  help: 'Agent execution time in seconds',
  labelNames: ['agent_type', 'stage'],
  buckets: [1, 5, 10, 30, 60, 120, 300]
});

const tokenCostTotal = new promClient.Counter({
  name: 'zekka_token_cost_usd_total',
  help: 'Total token cost in USD',
  labelNames: ['model', 'project']
});

const conflictsResolved = new promClient.Counter({
  name: 'zekka_conflicts_resolved_total',
  help: 'Total number of conflicts resolved',
  labelNames: ['resolution_method', 'success']
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeProjects);
register.registerMetric(activeAgents);
register.registerMetric(projectsCompleted);
register.registerMetric(agentExecutionTime);
register.registerMetric(tokenCostTotal);
register.registerMetric(conflictsResolved);

/**
 * Middleware to track HTTP request metrics
 */
function metricsMiddleware(req, res, next) {
  const start = Date.now();

  // Track response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);

    httpRequestTotal.labels(req.method, route, res.statusCode.toString()).inc();
  });

  next();
}

/**
 * Get metrics in Prometheus format
 */
async function getMetrics() {
  return await register.metrics();
}

/**
 * Track project metrics
 */
function trackProject(action, status) {
  switch (action) {
  case 'started':
    activeProjects.inc();
    break;
  case 'completed':
    activeProjects.dec();
    projectsCompleted.labels(status).inc();
    break;
  }
}

/**
 * Track agent metrics
 */
function trackAgent(action, agentType, stage, duration) {
  switch (action) {
  case 'started':
    activeAgents.inc();
    break;
  case 'completed':
    activeAgents.dec();
    if (duration) {
      agentExecutionTime.labels(agentType, stage).observe(duration);
    }
    break;
  }
}

/**
 * Track token cost
 */
function trackCost(model, project, cost) {
  tokenCostTotal.labels(model, project).inc(cost);
}

/**
 * Track conflict resolution
 */
function trackConflict(method, success) {
  conflictsResolved.labels(method, success.toString()).inc();
}

module.exports = {
  metricsMiddleware,
  getMetrics,
  trackProject,
  trackAgent,
  trackCost,
  trackConflict,
  register
};
