/**
 * Agent Events
 *
 * WebSocket event handlers for real-time agent status and task updates
 * Broadcasts agent activity, task progress, and performance metrics
 *
 * @module events/agent.events
 */

const Joi = require('joi');
const {
  wrapHandler,
  validateEventData,
  createSuccessResponse,
  createErrorResponse
} = require('../middleware/socket-error-handler');
const { trackRoom, untrackRoom } = require('../middleware/websocket');
const { getUserId } = require('../utils/socket-auth');

// Validation schemas
const agentSubscribeSchema = Joi.object({
  agentId: Joi.string().optional(),
  projectId: Joi.string().uuid().optional()
}).or('agentId', 'projectId');

/**
 * Setup agent event handlers
 *
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Socket instance
 * @param {Object} logger - Winston logger
 */
function setupAgentEvents(io, socket, logger) {
  // Subscribe to agent updates
  socket.on(
    'agent:subscribe',
    wrapHandler(
      async (data, callback) => {
        const validation = validateEventData(data, agentSubscribeSchema);
        if (!validation.valid) {
          if (callback) callback(createErrorResponse(validation.error, 'VALIDATION_ERROR'));
          return;
        }

        const { agentId, projectId } = validation.value;
        const userId = getUserId(socket);
        const rooms = [];

        if (agentId) {
          const room = `agent:${agentId}`;
          socket.join(room);
          trackRoom(socket.id, room);
          rooms.push(room);
        }

        if (projectId) {
          const room = `project:${projectId}:agents`;
          socket.join(room);
          trackRoom(socket.id, room);
          rooms.push(room);
        }

        logger.info('User subscribed to agent updates', {
          socketId: socket.id,
          userId,
          agentId,
          projectId
        });

        if (callback) {
          callback(
            createSuccessResponse({
              subscribed: true,
              rooms
            })
          );
        }
      },
      socket,
      logger,
      'agent:subscribe'
    )
  );

  // Unsubscribe from agent updates
  socket.on(
    'agent:unsubscribe',
    wrapHandler(
      async (data, callback) => {
        const validation = validateEventData(data, agentSubscribeSchema);
        if (!validation.valid) {
          if (callback) callback(createErrorResponse(validation.error, 'VALIDATION_ERROR'));
          return;
        }

        const { agentId, projectId } = validation.value;
        const userId = getUserId(socket);

        if (agentId) {
          const room = `agent:${agentId}`;
          socket.leave(room);
          untrackRoom(socket.id, room);
        }

        if (projectId) {
          const room = `project:${projectId}:agents`;
          socket.leave(room);
          untrackRoom(socket.id, room);
        }

        logger.info('User unsubscribed from agent updates', {
          socketId: socket.id,
          userId,
          agentId,
          projectId
        });

        if (callback) {
          callback(
            createSuccessResponse({
              unsubscribed: true
            })
          );
        }
      },
      socket,
      logger,
      'agent:unsubscribe'
    )
  );
}

/**
 * Broadcast agent status change
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} agentId - Agent ID
 * @param {string} status - New status (idle, busy, error, offline)
 * @param {Object} metadata - Additional metadata
 */
function broadcastAgentStatusChanged(io, agentId, status, metadata = {}) {
  const event = {
    agentId,
    status,
    ...metadata,
    timestamp: Date.now()
  };

  // Broadcast to agent-specific room
  io.to(`agent:${agentId}`).emit('agent:statusChanged', event);

  // Broadcast to global agents room
  io.to('agents:all').emit('agent:statusChanged', event);
}

/**
 * Broadcast task started
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} agentId - Agent ID
 * @param {string} taskId - Task ID
 * @param {string} projectId - Project ID
 * @param {Object} taskData - Task data
 */
function broadcastTaskStarted(io, agentId, taskId, projectId, taskData = {}) {
  const event = {
    agentId,
    taskId,
    projectId,
    description: taskData.description || 'Task started',
    type: taskData.type,
    priority: taskData.priority,
    estimatedDuration: taskData.estimatedDuration,
    timestamp: Date.now()
  };

  // Broadcast to agent-specific room
  io.to(`agent:${agentId}`).emit('agent:taskStarted', event);

  // Broadcast to project agents room
  if (projectId) {
    io.to(`project:${projectId}:agents`).emit('agent:taskStarted', event);
    io.to(`project:${projectId}`).emit('agent:taskStarted', event);
  }
}

/**
 * Broadcast task completed
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} agentId - Agent ID
 * @param {string} taskId - Task ID
 * @param {string} projectId - Project ID
 * @param {Object} result - Task result
 */
function broadcastTaskCompleted(io, agentId, taskId, projectId, result = {}) {
  const event = {
    agentId,
    taskId,
    projectId,
    result,
    duration: result.duration,
    success: true,
    timestamp: Date.now()
  };

  // Broadcast to agent-specific room
  io.to(`agent:${agentId}`).emit('agent:taskCompleted', event);

  // Broadcast to project agents room
  if (projectId) {
    io.to(`project:${projectId}:agents`).emit('agent:taskCompleted', event);
    io.to(`project:${projectId}`).emit('agent:taskCompleted', event);
  }
}

/**
 * Broadcast task failed
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} agentId - Agent ID
 * @param {string} taskId - Task ID
 * @param {string} projectId - Project ID
 * @param {Object} error - Error details
 */
function broadcastTaskFailed(io, agentId, taskId, projectId, error) {
  const event = {
    agentId,
    taskId,
    projectId,
    error: {
      message: error.message || 'Task failed',
      code: error.code,
      details: error.details
    },
    success: false,
    timestamp: Date.now()
  };

  // Broadcast to agent-specific room
  io.to(`agent:${agentId}`).emit('agent:taskFailed', event);

  // Broadcast to project agents room
  if (projectId) {
    io.to(`project:${projectId}:agents`).emit('agent:taskFailed', event);
    io.to(`project:${projectId}`).emit('agent:taskFailed', event);
  }
}

/**
 * Broadcast agent metrics update
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} agentId - Agent ID
 * @param {Object} metrics - Performance metrics
 */
function broadcastAgentMetrics(io, agentId, metrics) {
  const event = {
    agentId,
    metrics: {
      tasksCompleted: metrics.tasksCompleted || 0,
      tasksFailed: metrics.tasksFailed || 0,
      averageTaskDuration: metrics.averageTaskDuration || 0,
      uptime: metrics.uptime || 0,
      cpu: metrics.cpu,
      memory: metrics.memory,
      ...metrics
    },
    timestamp: Date.now()
  };

  // Broadcast to agent-specific room
  io.to(`agent:${agentId}`).emit('agent:metricsUpdated', event);

  // Broadcast to global agents room
  io.to('agents:all').emit('agent:metricsUpdated', event);
}

/**
 * Broadcast agent log/output
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} agentId - Agent ID
 * @param {string} taskId - Task ID
 * @param {string} projectId - Project ID
 * @param {string} log - Log message
 * @param {string} level - Log level (info, warn, error)
 */
function broadcastAgentLog(
  io,
  agentId,
  taskId,
  projectId,
  log,
  level = 'info'
) {
  const event = {
    agentId,
    taskId,
    projectId,
    log,
    level,
    timestamp: Date.now()
  };

  // Broadcast to agent-specific room
  io.to(`agent:${agentId}`).emit('agent:log', event);

  // Broadcast to project room if available
  if (projectId) {
    io.to(`project:${projectId}`).emit('agent:log', event);
  }
}

/**
 * Broadcast agent progress update
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} agentId - Agent ID
 * @param {string} taskId - Task ID
 * @param {string} projectId - Project ID
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} message - Progress message
 */
function broadcastAgentProgress(
  io,
  agentId,
  taskId,
  projectId,
  progress,
  message
) {
  const event = {
    agentId,
    taskId,
    projectId,
    progress: Math.min(100, Math.max(0, progress)),
    message,
    timestamp: Date.now()
  };

  // Broadcast to agent-specific room
  io.to(`agent:${agentId}`).emit('agent:progress', event);

  // Broadcast to project room
  if (projectId) {
    io.to(`project:${projectId}`).emit('agent:progress', event);
  }
}

module.exports = {
  setupAgentEvents,
  broadcastAgentStatusChanged,
  broadcastTaskStarted,
  broadcastTaskCompleted,
  broadcastTaskFailed,
  broadcastAgentMetrics,
  broadcastAgentLog,
  broadcastAgentProgress
};
