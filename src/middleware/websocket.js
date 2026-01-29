/**
 * WebSocket Middleware
 *
 * Socket.IO setup with authentication, connection handling, and event routing
 * Provides real-time communication for messages, agents, metrics, and projects
 *
 * @module middleware/websocket
 */

const socketIO = require('socket.io');
const { authenticateSocket, getUserId } = require('../utils/socket-auth');
const { setupMessageEvents } = require('../events/message.events');
const { setupAgentEvents } = require('../events/agent.events');
const { setupMetricsEvents } = require('../events/metrics.events');
const { setupProjectEvents } = require('../events/project.events');
const { handleSocketError } = require('./socket-error-handler');

let io = null;

// Connection tracking
const connections = new Map(); // socketId -> { userId, rooms, connectedAt }
const userSockets = new Map(); // userId -> Set of socketIds

/**
 * Initialize WebSocket server with authentication and event handlers
 *
 * @param {Object} server - HTTP server instance
 * @param {Object} logger - Winston logger instance
 * @returns {Object} - Socket.IO instance
 */
function initializeWebSocket(server, logger) {
  io = socketIO(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/ws',
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6, // 1MB
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  // Authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on('connection', (socket) => {
    handleConnection(socket, logger);

    // Setup event handlers
    setupMessageEvents(io, socket, logger);
    setupAgentEvents(io, socket, logger);
    setupMetricsEvents(io, socket, logger);
    setupProjectEvents(io, socket, logger);

    // Setup error handler
    handleSocketError(socket, logger);

    // Disconnection handler
    socket.on('disconnect', (reason) => {
      handleDisconnection(socket, reason, logger);
    });

    // Heartbeat/ping-pong
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Connection health check
    socket.on('health', () => {
      socket.emit('health:response', {
        status: 'ok',
        timestamp: Date.now(),
        uptime: process.uptime()
      });
    });
  });

  // Periodic connection cleanup (every 5 minutes)
  setInterval(
    () => {
      cleanupStaleConnections(logger);
    },
    5 * 60 * 1000
  );

  logger.info('✅ WebSocket server initialized on path: /ws');
  logger.info(
    `📊 Max connections: ${process.env.MAX_WS_CONNECTIONS || '5000'}`
  );
  logger.info('🔒 Authentication: Required');

  return io;
}

/**
 * Handle new WebSocket connection
 *
 * @param {Object} socket - Socket.IO socket instance
 * @param {Object} logger - Winston logger instance
 */
function handleConnection(socket, logger) {
  const userId = getUserId(socket);

  // Track connection
  connections.set(socket.id, {
    userId,
    username: socket.user?.username,
    rooms: new Set(),
    connectedAt: Date.now(),
    lastActivity: Date.now()
  });

  // Track user's sockets
  if (userId) {
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
  }

  logger.info(`🔌 WebSocket connected: ${socket.id}`, {
    userId,
    username: socket.user?.username,
    ip: socket.metadata?.ip,
    userAgent: socket.metadata?.userAgent
  });

  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to Zekka Framework',
    socketId: socket.id,
    userId,
    timestamp: Date.now(),
    features: {
      messages: true,
      agents: true,
      metrics: true,
      projects: true
    }
  });

  // Check connection limits
  const totalConnections = connections.size;
  const maxConnections = parseInt(process.env.MAX_WS_CONNECTIONS || '5000', 10);

  if (totalConnections >= maxConnections) {
    logger.warn(
      `⚠️  Connection limit approaching: ${totalConnections}/${maxConnections}`
    );

    // Notify admins
    io.to('admin').emit('system:warning', {
      type: 'connection_limit',
      current: totalConnections,
      max: maxConnections,
      timestamp: Date.now()
    });
  }
}

/**
 * Handle WebSocket disconnection
 *
 * @param {Object} socket - Socket.IO socket instance
 * @param {string} reason - Disconnection reason
 * @param {Object} logger - Winston logger instance
 */
function handleDisconnection(socket, reason, logger) {
  const userId = getUserId(socket);
  const connectionData = connections.get(socket.id);

  logger.info(`🔌 WebSocket disconnected: ${socket.id} (${reason})`, {
    userId,
    username: socket.user?.username,
    duration: connectionData ? Date.now() - connectionData.connectedAt : 0
  });

  // Clean up connection tracking
  if (connectionData) {
    // Leave all rooms
    connectionData.rooms.forEach((room) => {
      socket.leave(room);
    });

    connections.delete(socket.id);
  }

  // Clean up user sockets tracking
  if (userId && userSockets.has(userId)) {
    userSockets.get(userId).delete(socket.id);

    // Remove user entry if no more sockets
    if (userSockets.get(userId).size === 0) {
      userSockets.delete(userId);
    }
  }
}

/**
 * Clean up stale connections
 * Removes connections that haven't had activity in 30 minutes
 *
 * @param {Object} logger - Winston logger instance
 */
function cleanupStaleConnections(logger) {
  const now = Date.now();
  const staleThreshold = 30 * 60 * 1000; // 30 minutes
  let staleCount = 0;

  connections.forEach((data, socketId) => {
    if (now - data.lastActivity > staleThreshold) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
        staleCount++;
      }
      connections.delete(socketId);
    }
  });

  if (staleCount > 0) {
    logger.info(`🧹 Cleaned up ${staleCount} stale WebSocket connections`);
  }
}

/**
 * Update connection activity timestamp
 *
 * @param {string} socketId - Socket ID
 */
function updateActivity(socketId) {
  const connection = connections.get(socketId);
  if (connection) {
    connection.lastActivity = Date.now();
  }
}

/**
 * Track room membership
 *
 * @param {string} socketId - Socket ID
 * @param {string} room - Room name
 */
function trackRoom(socketId, room) {
  const connection = connections.get(socketId);
  if (connection) {
    connection.rooms.add(room);
  }
}

/**
 * Untrack room membership
 *
 * @param {string} socketId - Socket ID
 * @param {string} room - Room name
 */
function untrackRoom(socketId, room) {
  const connection = connections.get(socketId);
  if (connection) {
    connection.rooms.delete(room);
  }
}

/**
 * Get all socket IDs for a user
 *
 * @param {string} userId - User ID
 * @returns {Set<string>} - Set of socket IDs
 */
function getUserSocketIds(userId) {
  return userSockets.get(userId) || new Set();
}

/**
 * Get connection statistics
 *
 * @returns {Object} - Connection stats
 */
function getConnectionStats() {
  const roomCounts = {};
  connections.forEach((data) => {
    data.rooms.forEach((room) => {
      roomCounts[room] = (roomCounts[room] || 0) + 1;
    });
  });

  return {
    total: connections.size,
    users: userSockets.size,
    rooms: roomCounts,
    timestamp: Date.now()
  };
}

/**
 * Get Socket.IO instance
 *
 * @returns {Object} - Socket.IO instance
 */
function getIO() {
  if (!io) {
    throw new Error(
      'WebSocket not initialized. Call initializeWebSocket first.'
    );
  }
  return io;
}

/**
 * Broadcast to all connected clients
 *
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
function broadcastToAll(event, data) {
  if (!io) return;
  io.emit(event, data);
}

/**
 * Get connected clients count
 *
 * @returns {number} - Number of connected clients
 */
function getConnectedClients() {
  if (!io) return 0;
  return io.engine.clientsCount;
}

module.exports = {
  initializeWebSocket,
  getIO,
  broadcastToAll,
  getConnectedClients,
  getConnectionStats,
  getUserSocketIds,
  updateActivity,
  trackRoom,
  untrackRoom,
  // Legacy exports for backward compatibility
  broadcastProjectUpdate: (projectId, update) => {
    if (io) io.to(`project:${projectId}`).emit('project:update', update);
  },
  broadcastStageUpdate: (projectId, stage, data) => {
    if (io) io.to(`project:${projectId}`).emit('project:stage', { stage, ...data });
  },
  broadcastAgentActivity: (projectId, agent, activity) => {
    if (io) io.to(`project:${projectId}`).emit('project:agent', { agent, activity });
  },
  broadcastConflict: (projectId, conflict) => {
    if (io) io.to(`project:${projectId}`).emit('project:conflict', conflict);
  },
  broadcastCostUpdate: (projectId, cost) => {
    if (io) io.to(`project:${projectId}`).emit('project:cost', { cost });
  },
  broadcastMetrics: (metrics) => {
    if (io) io.to('system:metrics').emit('system:metrics', metrics);
  },
  broadcastProjectComplete: (projectId, result) => {
    if (io) io.to(`project:${projectId}`).emit('project:complete', result);
  },
  broadcastProjectError: (projectId, error) => {
    if (io) {
      io.to(`project:${projectId}`).emit('project:error', {
        error: error.message || error
      });
    }
  }
};
