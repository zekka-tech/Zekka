/**
 * WebSocket Error Handler
 *
 * Comprehensive error handling for Socket.IO events
 * Provides graceful error recovery and logging
 *
 * @module middleware/socket-error-handler
 */

const { updateActivity } = require('./websocket');

/**
 * Setup error handling for a socket
 *
 * @param {Object} socket - Socket.IO socket instance
 * @param {Object} logger - Winston logger instance
 */
function handleSocketError(socket, logger) {
  // Generic error handler
  socket.on('error', (error) => {
    logger.error(`Socket error: ${socket.id}`, {
      error: error.message,
      stack: error.stack,
      userId: socket.user?.userId
    });

    socket.emit('error:response', {
      message: 'An error occurred',
      code: 'SOCKET_ERROR',
      timestamp: Date.now()
    });
  });

  // Connection error handler
  socket.on('connect_error', (error) => {
    logger.error(`Connection error: ${socket.id}`, {
      error: error.message,
      userId: socket.user?.userId
    });
  });

  // Reconnection attempt handler
  socket.on('reconnect_attempt', (attemptNumber) => {
    logger.info(`Reconnection attempt: ${socket.id}`, {
      attempt: attemptNumber,
      userId: socket.user?.userId
    });
  });

  // Reconnection error handler
  socket.on('reconnect_error', (error) => {
    logger.error(`Reconnection error: ${socket.id}`, {
      error: error.message,
      userId: socket.user?.userId
    });
  });

  // Reconnection failed handler
  socket.on('reconnect_failed', () => {
    logger.error(`Reconnection failed: ${socket.id}`, {
      userId: socket.user?.userId
    });
  });
}

/**
 * Wrap event handler with error handling
 * Provides automatic error catching and logging
 *
 * @param {Function} handler - Event handler function
 * @param {Object} socket - Socket.IO socket instance
 * @param {Object} logger - Winston logger instance
 * @param {string} eventName - Event name (for logging)
 * @returns {Function} - Wrapped handler
 */
function wrapHandler(handler, socket, logger, eventName) {
  return async (...args) => {
    try {
      // Update activity tracking
      if (typeof updateActivity === 'function') {
        updateActivity(socket.id);
      }

      // Execute handler
      await handler(...args);
    } catch (error) {
      logger.error(`Error in ${eventName} handler`, {
        socketId: socket.id,
        userId: socket.user?.userId,
        error: error.message,
        stack: error.stack
      });

      // Send error response to client
      const callback = args[args.length - 1];
      const errorResponse = {
        success: false,
        error: {
          message: error.message || 'An error occurred',
          code: error.code || 'HANDLER_ERROR'
        },
        timestamp: Date.now()
      };

      // Use acknowledgment if callback provided
      if (typeof callback === 'function') {
        callback(errorResponse);
      } else {
        // Emit error event
        socket.emit(`${eventName}:error`, errorResponse);
      }
    }
  };
}

/**
 * Create error response
 *
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} details - Additional details
 * @returns {Object} - Error response
 */
function createErrorResponse(message, code = 'ERROR', details = {}) {
  return {
    success: false,
    error: {
      message,
      code,
      ...details
    },
    timestamp: Date.now()
  };
}

/**
 * Create success response
 *
 * @param {Object} data - Response data
 * @returns {Object} - Success response
 */
function createSuccessResponse(data = {}) {
  return {
    success: true,
    data,
    timestamp: Date.now()
  };
}

/**
 * Validate event data against schema
 *
 * @param {Object} data - Event data
 * @param {Object} schema - Joi schema
 * @returns {Object} - Validation result { valid: boolean, error: string }
 */
function validateEventData(data, schema) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return {
      valid: false,
      error: error.details.map(d => d.message).join(', '),
      value: null
    };
  }

  return {
    valid: true,
    error: null,
    value
  };
}

/**
 * Rate limit handler wrapper
 * Prevents event spam from clients
 *
 * @param {Function} handler - Event handler
 * @param {Object} options - Rate limit options
 * @returns {Function} - Rate limited handler
 */
function rateLimitHandler(handler, options = {}) {
  const {
    maxRequests = 10,
    windowMs = 1000,
    message = 'Too many requests'
  } = options;

  const requests = new Map(); // socketId -> [timestamps]

  return function(socket, logger, eventName) {
    return wrapHandler(async (...args) => {
      const now = Date.now();
      const socketRequests = requests.get(socket.id) || [];

      // Remove old requests outside window
      const validRequests = socketRequests.filter(
        timestamp => now - timestamp < windowMs
      );

      if (validRequests.length >= maxRequests) {
        logger.warn(`Rate limit exceeded for ${eventName}`, {
          socketId: socket.id,
          userId: socket.user?.userId
        });

        throw {
          message,
          code: 'RATE_LIMIT_EXCEEDED'
        };
      }

      // Add current request
      validRequests.push(now);
      requests.set(socket.id, validRequests);

      // Execute handler
      return await handler(...args);
    }, socket, logger, eventName);
  };
}

/**
 * Exponential backoff calculator
 *
 * @param {number} attempt - Attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @returns {number} - Delay in milliseconds
 */
function calculateBackoff(attempt, baseDelay = 1000, maxDelay = 30000) {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

/**
 * Retry handler with exponential backoff
 *
 * @param {Function} operation - Operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of operation
 */
async function retryWithBackoff(operation, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = () => true
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries && shouldRetry(error)) {
        const delay = calculateBackoff(attempt, baseDelay, maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

module.exports = {
  handleSocketError,
  wrapHandler,
  createErrorResponse,
  createSuccessResponse,
  validateEventData,
  rateLimitHandler,
  calculateBackoff,
  retryWithBackoff
};
