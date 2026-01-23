/**
 * Metrics Events
 *
 * WebSocket event handlers for real-time analytics and cost tracking
 * Broadcasts system metrics, performance data, and cost breakdowns
 *
 * @module events/metrics.events
 */

const Joi = require('joi');
const { wrapHandler, validateEventData, createSuccessResponse, createErrorResponse } = require('../middleware/socket-error-handler');
const { trackRoom, untrackRoom } = require('../middleware/websocket');
const { getUserId } = require('../utils/socket-auth');

// Validation schemas
const metricsRequestSchema = Joi.object({
  period: Joi.string().valid('realtime', 'hourly', 'daily', 'weekly', 'monthly').default('realtime'),
  metrics: Joi.array().items(Joi.string()).optional()
});

/**
 * Setup metrics event handlers
 *
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Socket instance
 * @param {Object} logger - Winston logger
 */
function setupMetricsEvents(io, socket, logger) {
  // Subscribe to metrics updates
  socket.on('metrics:subscribe', wrapHandler(async (data, callback) => {
    const validation = validateEventData(data || {}, metricsRequestSchema);
    if (!validation.valid) {
      if (callback) callback(createErrorResponse(validation.error, 'VALIDATION_ERROR'));
      return;
    }

    const { period } = validation.value;
    const userId = getUserId(socket);
    const room = `metrics:${period}`;

    socket.join(room);
    trackRoom(socket.id, room);

    logger.info(`User subscribed to metrics: ${period}`, {
      socketId: socket.id,
      userId
    });

    if (callback) {
      callback(createSuccessResponse({
        subscribed: true,
        period
      }));
    }
  }, socket, logger, 'metrics:subscribe'));

  // Unsubscribe from metrics
  socket.on('metrics:unsubscribe', wrapHandler(async (data, callback) => {
    const validation = validateEventData(data || {}, metricsRequestSchema);
    if (!validation.valid) {
      if (callback) callback(createErrorResponse(validation.error, 'VALIDATION_ERROR'));
      return;
    }

    const { period } = validation.value;
    const userId = getUserId(socket);
    const room = `metrics:${period}`;

    socket.leave(room);
    untrackRoom(socket.id, room);

    logger.info(`User unsubscribed from metrics: ${period}`, {
      socketId: socket.id,
      userId
    });

    if (callback) {
      callback(createSuccessResponse({
        unsubscribed: true,
        period
      }));
    }
  }, socket, logger, 'metrics:unsubscribe'));

  // Request current metrics snapshot
  socket.on('metrics:request', wrapHandler(async (data, callback) => {
    const validation = validateEventData(data || {}, metricsRequestSchema);
    if (!validation.valid) {
      if (callback) callback(createErrorResponse(validation.error, 'VALIDATION_ERROR'));
      return;
    }

    const { period, metrics } = validation.value;

    // TODO: Fetch actual metrics from database/service
    const mockMetrics = generateMockMetrics(period, metrics);

    if (callback) {
      callback(createSuccessResponse({
        period,
        data: mockMetrics
      }));
    }
  }, socket, logger, 'metrics:request'));

  // Subscribe to cost updates
  socket.on('costs:subscribe', wrapHandler(async (data, callback) => {
    const userId = getUserId(socket);
    const room = 'costs:updates';

    socket.join(room);
    trackRoom(socket.id, room);

    logger.info(`User subscribed to cost updates`, {
      socketId: socket.id,
      userId
    });

    if (callback) {
      callback(createSuccessResponse({
        subscribed: true
      }));
    }
  }, socket, logger, 'costs:subscribe'));
}

/**
 * Broadcast metrics update
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} period - Time period (realtime, hourly, daily, weekly, monthly)
 * @param {Object} data - Metrics data
 */
function broadcastMetricsUpdate(io, period, data) {
  const event = {
    period,
    data,
    timestamp: Date.now()
  };

  io.to(`metrics:${period}`).emit('metrics:updated', event);
}

/**
 * Broadcast system metrics
 *
 * @param {Object} io - Socket.IO instance
 * @param {Object} metrics - System metrics
 */
function broadcastSystemMetrics(io, metrics) {
  const event = {
    system: {
      cpu: metrics.cpu || 0,
      memory: metrics.memory || 0,
      disk: metrics.disk || 0,
      network: metrics.network || {},
      uptime: metrics.uptime || 0
    },
    agents: {
      active: metrics.agents?.active || 0,
      idle: metrics.agents?.idle || 0,
      total: metrics.agents?.total || 0
    },
    projects: {
      active: metrics.projects?.active || 0,
      queued: metrics.projects?.queued || 0,
      completed: metrics.projects?.completed || 0
    },
    timestamp: Date.now()
  };

  io.to('metrics:realtime').emit('metrics:system', event);
}

/**
 * Broadcast cost update
 *
 * @param {Object} io - Socket.IO instance
 * @param {Object} costData - Cost data
 */
function broadcastCostUpdate(io, costData) {
  const event = {
    total: costData.total || 0,
    currency: costData.currency || 'USD',
    period: costData.period || 'today',
    breakdown: costData.breakdown || {},
    timestamp: Date.now()
  };

  io.to('costs:updates').emit('costs:updated', event);
}

/**
 * Broadcast cost breakdown
 *
 * @param {Object} io - Socket.IO instance
 * @param {Object} breakdown - Detailed cost breakdown
 */
function broadcastCostBreakdown(io, breakdown) {
  const event = {
    models: breakdown.models || {},
    agents: breakdown.agents || {},
    projects: breakdown.projects || {},
    total: breakdown.total || 0,
    currency: breakdown.currency || 'USD',
    period: breakdown.period || 'today',
    timestamp: Date.now()
  };

  io.to('costs:updates').emit('costs:breakdown', event);
}

/**
 * Broadcast performance metrics
 *
 * @param {Object} io - Socket.IO instance
 * @param {Object} performance - Performance data
 */
function broadcastPerformanceMetrics(io, performance) {
  const event = {
    responseTime: {
      average: performance.responseTime?.average || 0,
      p50: performance.responseTime?.p50 || 0,
      p95: performance.responseTime?.p95 || 0,
      p99: performance.responseTime?.p99 || 0
    },
    throughput: {
      requestsPerSecond: performance.throughput?.requestsPerSecond || 0,
      requestsPerMinute: performance.throughput?.requestsPerMinute || 0
    },
    errors: {
      rate: performance.errors?.rate || 0,
      count: performance.errors?.count || 0
    },
    timestamp: Date.now()
  };

  io.to('metrics:realtime').emit('metrics:performance', event);
}

/**
 * Broadcast usage statistics
 *
 * @param {Object} io - Socket.IO instance
 * @param {Object} usage - Usage statistics
 */
function broadcastUsageStats(io, usage) {
  const event = {
    tokens: {
      input: usage.tokens?.input || 0,
      output: usage.tokens?.output || 0,
      total: usage.tokens?.total || 0
    },
    requests: {
      total: usage.requests?.total || 0,
      successful: usage.requests?.successful || 0,
      failed: usage.requests?.failed || 0
    },
    models: usage.models || {},
    timestamp: Date.now()
  };

  io.to('metrics:realtime').emit('metrics:usage', event);
}

/**
 * Generate mock metrics for testing
 *
 * @param {string} period - Time period
 * @param {Array} requestedMetrics - Specific metrics requested
 * @returns {Object} - Mock metrics data
 */
function generateMockMetrics(period, requestedMetrics) {
  const baseMetrics = {
    system: {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      uptime: process.uptime()
    },
    agents: {
      active: Math.floor(Math.random() * 10),
      idle: Math.floor(Math.random() * 5),
      total: 15
    },
    projects: {
      active: Math.floor(Math.random() * 5),
      queued: Math.floor(Math.random() * 3),
      completed: Math.floor(Math.random() * 100)
    },
    costs: {
      total: Math.random() * 100,
      currency: 'USD',
      period
    }
  };

  // Filter metrics if specific ones requested
  if (requestedMetrics && requestedMetrics.length > 0) {
    const filtered = {};
    requestedMetrics.forEach(key => {
      if (baseMetrics[key]) {
        filtered[key] = baseMetrics[key];
      }
    });
    return filtered;
  }

  return baseMetrics;
}

module.exports = {
  setupMetricsEvents,
  broadcastMetricsUpdate,
  broadcastSystemMetrics,
  broadcastCostUpdate,
  broadcastCostBreakdown,
  broadcastPerformanceMetrics,
  broadcastUsageStats
};
