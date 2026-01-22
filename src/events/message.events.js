/**
 * Message Events
 *
 * WebSocket event handlers for real-time messaging
 * Handles message sending, receiving, editing, deletion, and typing indicators
 *
 * @module events/message.events
 */

const Joi = require('joi');
const { wrapHandler, validateEventData, createSuccessResponse, createErrorResponse } = require('../middleware/socket-error-handler');
const { trackRoom, untrackRoom } = require('../middleware/websocket');
const { getUserId } = require('../utils/socket-auth');

// Validation schemas
const messageSendSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
  content: Joi.string().min(1).max(10000).required(),
  metadata: Joi.object().optional()
});

const messageTypingSchema = Joi.object({
  conversationId: Joi.string().uuid().required()
});

const conversationJoinSchema = Joi.object({
  conversationId: Joi.string().uuid().required()
});

// Typing indicator tracking
const typingUsers = new Map(); // conversationId -> Set of userIds

/**
 * Setup message event handlers
 *
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Socket instance
 * @param {Object} logger - Winston logger
 */
function setupMessageEvents(io, socket, logger) {
  // Join conversation room
  socket.on('conversation:join', wrapHandler(async (data, callback) => {
    const validation = validateEventData(data, conversationJoinSchema);
    if (!validation.valid) {
      if (callback) callback(createErrorResponse(validation.error, 'VALIDATION_ERROR'));
      return;
    }

    const { conversationId } = validation.value;
    const userId = getUserId(socket);
    const room = `conversation:${conversationId}`;

    // Join the room
    socket.join(room);
    trackRoom(socket.id, room);

    logger.info(`User joined conversation: ${conversationId}`, {
      socketId: socket.id,
      userId
    });

    // Notify other members
    socket.to(room).emit('conversation:userJoined', {
      conversationId,
      userId,
      username: socket.user?.username,
      timestamp: Date.now()
    });

    // Send success response
    if (callback) {
      callback(createSuccessResponse({
        conversationId,
        joined: true
      }));
    }
  }, socket, logger, 'conversation:join'));

  // Leave conversation room
  socket.on('conversation:leave', wrapHandler(async (data, callback) => {
    const validation = validateEventData(data, conversationJoinSchema);
    if (!validation.valid) {
      if (callback) callback(createErrorResponse(validation.error, 'VALIDATION_ERROR'));
      return;
    }

    const { conversationId } = validation.value;
    const userId = getUserId(socket);
    const room = `conversation:${conversationId}`;

    // Leave the room
    socket.leave(room);
    untrackRoom(socket.id, room);

    // Clear typing indicator if set
    clearTypingIndicator(conversationId, userId, io);

    logger.info(`User left conversation: ${conversationId}`, {
      socketId: socket.id,
      userId
    });

    // Notify other members
    socket.to(room).emit('conversation:userLeft', {
      conversationId,
      userId,
      username: socket.user?.username,
      timestamp: Date.now()
    });

    if (callback) {
      callback(createSuccessResponse({
        conversationId,
        left: true
      }));
    }
  }, socket, logger, 'conversation:leave'));

  // Send message
  socket.on('message:send', wrapHandler(async (data, callback) => {
    const validation = validateEventData(data, messageSendSchema);
    if (!validation.valid) {
      if (callback) callback(createErrorResponse(validation.error, 'VALIDATION_ERROR'));
      return;
    }

    const { conversationId, content, metadata } = validation.value;
    const userId = getUserId(socket);

    // TODO: Save message to database
    // For now, generate a mock message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const message = {
      id: messageId,
      conversationId,
      userId,
      username: socket.user?.username,
      role: socket.user?.role || 'user',
      content,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    logger.info(`Message sent: ${messageId}`, {
      conversationId,
      userId,
      contentLength: content.length
    });

    // Clear typing indicator
    clearTypingIndicator(conversationId, userId, io);

    // Broadcast to conversation members
    io.to(`conversation:${conversationId}`).emit('message:received', message);

    // Send acknowledgment to sender
    if (callback) {
      callback(createSuccessResponse({
        messageId,
        sent: true
      }));
    }
  }, socket, logger, 'message:send'));

  // Typing indicator
  socket.on('message:typing', wrapHandler(async (data) => {
    const validation = validateEventData(data, messageTypingSchema);
    if (!validation.valid) return;

    const { conversationId } = validation.value;
    const userId = getUserId(socket);

    // Track typing user
    if (!typingUsers.has(conversationId)) {
      typingUsers.set(conversationId, new Set());
    }
    typingUsers.get(conversationId).add(userId);

    // Broadcast typing indicator to others
    socket.to(`conversation:${conversationId}`).emit('user:isTyping', {
      conversationId,
      userId,
      username: socket.user?.username,
      timestamp: Date.now()
    });

    // Auto-clear typing indicator after 3 seconds
    setTimeout(() => {
      clearTypingIndicator(conversationId, userId, io);
    }, 3000);
  }, socket, logger, 'message:typing'));

  // Stop typing
  socket.on('message:stopTyping', wrapHandler(async (data) => {
    const validation = validateEventData(data, messageTypingSchema);
    if (!validation.valid) return;

    const { conversationId } = validation.value;
    const userId = getUserId(socket);

    clearTypingIndicator(conversationId, userId, io);
  }, socket, logger, 'message:stopTyping'));
}

/**
 * Clear typing indicator for a user
 *
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @param {Object} io - Socket.IO instance
 */
function clearTypingIndicator(conversationId, userId, io) {
  if (typingUsers.has(conversationId)) {
    const users = typingUsers.get(conversationId);
    if (users.has(userId)) {
      users.delete(userId);

      // Notify that user stopped typing
      io.to(`conversation:${conversationId}`).emit('user:stoppedTyping', {
        conversationId,
        userId,
        timestamp: Date.now()
      });

      // Clean up if no more typing users
      if (users.size === 0) {
        typingUsers.delete(conversationId);
      }
    }
  }
}

/**
 * Broadcast message update (edit)
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} conversationId - Conversation ID
 * @param {Object} message - Updated message
 */
function broadcastMessageUpdated(io, conversationId, message) {
  io.to(`conversation:${conversationId}`).emit('message:updated', {
    id: message.id,
    conversationId,
    content: message.content,
    updatedAt: message.updatedAt || new Date().toISOString(),
    timestamp: Date.now()
  });
}

/**
 * Broadcast message deletion
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} conversationId - Conversation ID
 * @param {string} messageId - Message ID
 */
function broadcastMessageDeleted(io, conversationId, messageId) {
  io.to(`conversation:${conversationId}`).emit('message:deleted', {
    id: messageId,
    conversationId,
    timestamp: Date.now()
  });
}

/**
 * Broadcast message to conversation
 *
 * @param {Object} io - Socket.IO instance
 * @param {string} conversationId - Conversation ID
 * @param {Object} message - Message data
 */
function broadcastMessage(io, conversationId, message) {
  io.to(`conversation:${conversationId}`).emit('message:received', {
    ...message,
    timestamp: Date.now()
  });
}

module.exports = {
  setupMessageEvents,
  broadcastMessageUpdated,
  broadcastMessageDeleted,
  broadcastMessage
};
