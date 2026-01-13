/**
 * WebSocket Handler
 * Provides real-time updates for project execution
 */

const socketIO = require('socket.io');

let io = null;

/**
 * Initialize WebSocket server
 */
function initializeWebSocket(server, logger) {
  io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    path: '/ws'
  });
  
  io.on('connection', (socket) => {
    logger.info(`🔌 WebSocket client connected: ${socket.id}`);
    
    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to Zekka Framework',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
    
    // Handle project subscription
    socket.on('subscribe:project', (projectId) => {
      logger.info(`📡 Client ${socket.id} subscribed to project: ${projectId}`);
      socket.join(`project:${projectId}`);
      socket.emit('subscribed', { projectId });
    });
    
    // Handle project unsubscription
    socket.on('unsubscribe:project', (projectId) => {
      logger.info(`📴 Client ${socket.id} unsubscribed from project: ${projectId}`);
      socket.leave(`project:${projectId}`);
      socket.emit('unsubscribed', { projectId });
    });
    
    // Handle system metrics subscription
    socket.on('subscribe:metrics', () => {
      logger.info(`📊 Client ${socket.id} subscribed to system metrics`);
      socket.join('system:metrics');
      socket.emit('subscribed:metrics', { success: true });
    });
    
    // Handle ping
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`🔌 WebSocket client disconnected: ${socket.id} (${reason})`);
    });
  });
  
  logger.info('✅ WebSocket server initialized on path: /ws');
  return io;
}

/**
 * Broadcast project update to subscribed clients
 */
function broadcastProjectUpdate(projectId, update) {
  if (!io) return;
  
  io.to(`project:${projectId}`).emit('project:update', {
    projectId,
    timestamp: new Date().toISOString(),
    ...update
  });
}

/**
 * Broadcast project stage update
 */
function broadcastStageUpdate(projectId, stage, data) {
  if (!io) return;
  
  io.to(`project:${projectId}`).emit('project:stage', {
    projectId,
    stage,
    timestamp: new Date().toISOString(),
    ...data
  });
}

/**
 * Broadcast agent activity
 */
function broadcastAgentActivity(projectId, agent, activity) {
  if (!io) return;
  
  io.to(`project:${projectId}`).emit('project:agent', {
    projectId,
    agent,
    activity,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast conflict resolution
 */
function broadcastConflict(projectId, conflict) {
  if (!io) return;
  
  io.to(`project:${projectId}`).emit('project:conflict', {
    projectId,
    timestamp: new Date().toISOString(),
    ...conflict
  });
}

/**
 * Broadcast cost update
 */
function broadcastCostUpdate(projectId, cost) {
  if (!io) return;
  
  io.to(`project:${projectId}`).emit('project:cost', {
    projectId,
    cost,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast system metrics
 */
function broadcastMetrics(metrics) {
  if (!io) return;
  
  io.to('system:metrics').emit('system:metrics', {
    timestamp: new Date().toISOString(),
    ...metrics
  });
}

/**
 * Broadcast project completion
 */
function broadcastProjectComplete(projectId, result) {
  if (!io) return;
  
  io.to(`project:${projectId}`).emit('project:complete', {
    projectId,
    timestamp: new Date().toISOString(),
    ...result
  });
}

/**
 * Broadcast project error
 */
function broadcastProjectError(projectId, error) {
  if (!io) return;
  
  io.to(`project:${projectId}`).emit('project:error', {
    projectId,
    error: error.message || error,
    timestamp: new Date().toISOString()
  });
}

/**
 * Get connected clients count
 */
function getConnectedClients() {
  if (!io) return 0;
  return io.engine.clientsCount;
}

module.exports = {
  initializeWebSocket,
  broadcastProjectUpdate,
  broadcastStageUpdate,
  broadcastAgentActivity,
  broadcastConflict,
  broadcastCostUpdate,
  broadcastMetrics,
  broadcastProjectComplete,
  broadcastProjectError,
  getConnectedClients
};
