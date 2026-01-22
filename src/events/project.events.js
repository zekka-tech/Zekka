/**
 * Project Events
 *
 * WebSocket event handlers for real-time project updates
 * Handles project creation, updates, member management, and status changes
 *
 * @module events/project.events
 */

const Joi = require('joi');
const { wrapHandler, validateEventData, createSuccessResponse, createErrorResponse } = require('../middleware/socket-error-handler');
const { trackRoom, untrackRoom } = require('../middleware/websocket');
const { getUserId } = require('../utils/socket-auth');

// Validation schemas
const projectSubscribeSchema = Joi.object({
  projectId: Joi.string().uuid().required()
});

/**
 * Setup project event handlers
 *
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Socket instance
 * @param {Object} logger - Winston logger
 */
function setupProjectEvents(io, socket, logger) {
  // Subscribe to project updates
  socket.on('project:subscribe', wrapHandler(async (data, callback) => {
    const validation = validateEventData(data, projectSubscribeSchema);
    if (!validation.valid) {
      if (callback) callback(createErrorResponse(validation.error, 'VALIDATION_ERROR'));
      return;
    }

    const { projectId } = validation.value;
    const userId = getUserId(socket);
    const room = `project:${projectId}`;

    // Join the project room
    socket.join(room);
    trackRoom(socket.id, room);

    logger.info(`User subscribed to project: ${projectId}`, {
      socketId: socket.id,
      userId
    });

    // Notify other project members
    socket.to(room).emit('project:userJoined', {
      projectId,
      userId,
      username: socket.user?.username,
      timestamp: Date.now()
    });

    if (callback) {
      callback(createSuccessResponse({
        projectId,
        subscribed: true
      }));
    }
  }, socket, logger, 'project:subscribe'));

  // Unsubscribe from project updates
  socket.on('project:unsubscribe', wrapHandler(async (data, callback) => {
    const validation = validateEventData(data, projectSubscribeSchema);
    if (!validation.valid) {
      if (callback) callback(createErrorResponse(validation.error, 'VALIDATION_ERROR'));
      return;
    }

    const { projectId } = validation.value;
    const userId = getUserId(socket);
    const room = `project:${projectId}`;

    socket.leave(room);
    untrackRoom(socket.id, room);

    logger.info(`User unsubscribed from project: ${projectId}`, {
      socketId: socket.id,
      userId
    });

    // Notify other project members
    socket.to(room).emit('project:userLeft', {
      projectId,
      userId,
      username: socket.user?.username,
      timestamp: Date.now()
    });

    if (callback) {
      callback(createSuccessResponse({
        projectId,
        unsubscribed: true
      }));
    }
  }, socket, logger, 'project:unsubscribe'));

  // Legacy subscription support (for backward compatibility)
  socket.on('subscribe:project', wrapHandler(async (projectId, callback) => {
    if (typeof projectId === 'string') {
      const userId = getUserId(socket);
      const room = `project:${projectId}`;

      socket.join(room);
      trackRoom(socket.id, room);

      logger.info(`User subscribed to project (legacy): ${projectId}`, {
        socketId: socket.id,
        userId
      });

      socket.emit('subscribed', { projectId });

      if (callback) {
        callback(createSuccessResponse({ projectId, subscribed: true }));
      }
    }
  }, socket, logger, 'subscribe:project'));

  // Legacy unsubscription support
  socket.on('unsubscribe:project', wrapHandler(async (projectId, callback) => {
    if (typeof projectId === 'string') {
      const userId = getUserId(socket);
      const room = `project:${projectId}`;

      socket.leave(room);
      untrackRoom(socket.id, room);

      logger.info(`User unsubscribed from project (legacy): ${projectId}`, {
        socketId: socket.id,
        userId
      });

      socket.emit('unsubscribed', { projectId });

      if (callback) {
        callback(createSuccessResponse({ projectId, unsubscribed: true }));
      }
    }
  }, socket, logger, 'unsubscribe:project'));

  // Subscribe to all projects (admin only)
  socket.on('projects:subscribeAll', wrapHandler(async (data, callback) => {
    const userId = getUserId(socket);
    const room = 'projects:all';

    // TODO: Add role check for admin
    socket.join(room);
    trackRoom(socket.id, room);

    logger.info(`User subscribed to all projects`, {
      socketId: socket.id,
      userId
    });

    if (callback) {
      callback(createSuccessResponse({
        subscribed: true
      }));
    }
  }, socket, logger, 'projects:subscribeAll'));
}

/**
 * Broadcast project created
 *
 * @param {Object} io - Socket.IO instance
 * @param {Object} project - Project data
 */
function broadcastProjectCreated(io, project) {
  const event = {
    projectId: project.id,
    name: project.name,
    description: project.description,
    ownerId: project.ownerId,
    status: project.status || 'pending',
    createdAt: project.createdAt || new Date().toISOString(),
    timestamp: Date.now()
  };

  // Broadcast to all projects room
  io.to('projects:all').emit('project:created', event);

  // Broadcast to owner
  if (project.ownerId) {
    io.to(`user:${project.ownerId}`).emit('project:created', event);
  }
}

/**
 * Broadcast project updated
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} projectId - Project ID
 * @param {Object} updates - Updated fields
 */
function broadcastProjectUpdated(io, projectId, updates) {
  const event = {
    projectId,
    updates,
    updatedAt: new Date().toISOString(),
    timestamp: Date.now()
  };

  // Broadcast to project room
  io.to(`project:${projectId}`).emit('project:updated', event);

  // Broadcast to all projects room
  io.to('projects:all').emit('project:updated', event);
}

/**
 * Broadcast project status change
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} projectId - Project ID
 * @param {string} status - New status
 * @param {Object} metadata - Additional metadata
 */
function broadcastProjectStatus(io, projectId, status, metadata = {}) {
  const event = {
    projectId,
    status,
    ...metadata,
    timestamp: Date.now()
  };

  io.to(`project:${projectId}`).emit('project:statusChanged', event);
  io.to('projects:all').emit('project:statusChanged', event);
}

/**
 * Broadcast member added to project
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} projectId - Project ID
 * @param {Object} member - Member data
 */
function broadcastMemberAdded(io, projectId, member) {
  const event = {
    projectId,
    member: {
      userId: member.userId,
      username: member.username,
      role: member.role || 'member',
      addedAt: member.addedAt || new Date().toISOString()
    },
    timestamp: Date.now()
  };

  io.to(`project:${projectId}`).emit('project:memberAdded', event);
}

/**
 * Broadcast member removed from project
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID
 */
function broadcastMemberRemoved(io, projectId, userId) {
  const event = {
    projectId,
    userId,
    timestamp: Date.now()
  };

  io.to(`project:${projectId}`).emit('project:memberRemoved', event);
}

/**
 * Broadcast project progress update
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} projectId - Project ID
 * @param {number} progress - Progress percentage (0-100)
 * @param {Object} details - Progress details
 */
function broadcastProjectProgress(io, projectId, progress, details = {}) {
  const event = {
    projectId,
    progress: Math.min(100, Math.max(0, progress)),
    stage: details.stage,
    message: details.message,
    tasksCompleted: details.tasksCompleted,
    tasksTotal: details.tasksTotal,
    timestamp: Date.now()
  };

  io.to(`project:${projectId}`).emit('project:progress', event);
}

/**
 * Broadcast project stage update
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} projectId - Project ID
 * @param {Object} stage - Stage data
 */
function broadcastProjectStage(io, projectId, stage) {
  const event = {
    projectId,
    stage: {
      name: stage.name,
      status: stage.status,
      progress: stage.progress,
      startedAt: stage.startedAt,
      completedAt: stage.completedAt
    },
    timestamp: Date.now()
  };

  io.to(`project:${projectId}`).emit('project:stage', event);
}

/**
 * Broadcast project completion
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} projectId - Project ID
 * @param {Object} result - Completion result
 */
function broadcastProjectComplete(io, projectId, result) {
  const event = {
    projectId,
    success: result.success !== false,
    duration: result.duration,
    summary: result.summary,
    completedAt: result.completedAt || new Date().toISOString(),
    timestamp: Date.now()
  };

  io.to(`project:${projectId}`).emit('project:complete', event);
  io.to('projects:all').emit('project:complete', event);
}

/**
 * Broadcast project error
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} projectId - Project ID
 * @param {Object} error - Error details
 */
function broadcastProjectError(io, projectId, error) {
  const event = {
    projectId,
    error: {
      message: error.message || 'An error occurred',
      code: error.code,
      details: error.details
    },
    timestamp: Date.now()
  };

  io.to(`project:${projectId}`).emit('project:error', event);
}

/**
 * Broadcast conflict detected
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} projectId - Project ID
 * @param {Object} conflict - Conflict details
 */
function broadcastConflict(io, projectId, conflict) {
  const event = {
    projectId,
    conflict: {
      id: conflict.id,
      type: conflict.type,
      file: conflict.file,
      agents: conflict.agents,
      description: conflict.description
    },
    timestamp: Date.now()
  };

  io.to(`project:${projectId}`).emit('project:conflict', event);
}

module.exports = {
  setupProjectEvents,
  broadcastProjectCreated,
  broadcastProjectUpdated,
  broadcastProjectStatus,
  broadcastMemberAdded,
  broadcastMemberRemoved,
  broadcastProjectProgress,
  broadcastProjectStage,
  broadcastProjectComplete,
  broadcastProjectError,
  broadcastConflict
};
