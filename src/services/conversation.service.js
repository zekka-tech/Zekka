/**
 * Conversation Service
 * Handles chat and message management with authorization
 *
 * Features:
 * - Conversation CRUD operations
 * - Message sending and retrieval
 * - Message editing and deletion
 * - Pagination support
 * - Soft delete support
 * - Authorization checks via project membership
 */

const { AppError } = require('../utils/errors');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { getIO } = require('../middleware/websocket');

// Simple ID generator for compatibility
const generateId = () => {
  // Try to use uuid if available, otherwise use timestamp-based ID
  try {
    return uuidv4();
  } catch (e) {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

class ConversationService {
  /**
   * List conversations for a user in a project
   * @param {string} userId - User ID
   * @param {string} projectId - Project ID (optional)
   * @param {Object} pagination - Pagination options (limit, offset)
   * @returns {Promise<Object>} Conversations list with metadata
   */
  async listConversations(userId, projectId = null, pagination = {}) {
    try {
      const { limit = 20, offset = 0 } = pagination;

      let query = `
        SELECT DISTINCT
          c.id,
          c.title,
          c.project_id,
          c.user_id,
          c.created_at,
          c.updated_at,
          c.metadata,
          p.name as project_name,
          u.name as creator_name,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL) as message_count,
          (SELECT content FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message_at
        FROM conversations c
        JOIN projects p ON c.project_id = p.id
        LEFT JOIN users u ON c.user_id = u.user_id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE c.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND (p.owner_id = $1 OR pm.user_id = $1)
      `;

      const queryParams = [userId];
      let paramCount = 1;

      if (projectId) {
        paramCount++;
        query += ` AND c.project_id = $${paramCount}`;
        queryParams.push(projectId);
      }

      query += ` ORDER BY c.updated_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Get total count
      let countQuery = `
        SELECT COUNT(DISTINCT c.id) as total
        FROM conversations c
        JOIN projects p ON c.project_id = p.id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE c.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND (p.owner_id = $1 OR pm.user_id = $1)
      `;

      const countParams = [userId];
      let countParamCount = 1;

      if (projectId) {
        countParamCount++;
        countQuery += ` AND c.project_id = $${countParamCount}`;
        countParams.push(projectId);
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        conversations: result.rows.map(conv => ({
          ...conv,
          metadata: typeof conv.metadata === 'string' ? JSON.parse(conv.metadata) : conv.metadata
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      throw new AppError(`Failed to list conversations: ${error.message}`, 500);
    }
  }

  /**
   * Create a new conversation
   * @param {string} userId - User ID
   * @param {string} projectId - Project ID
   * @param {string} title - Conversation title
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Created conversation
   */
  async createConversation(userId, projectId, title, metadata = {}) {
    try {
      if (!title) {
        throw new AppError('Conversation title is required', 400);
      }

      // Check if user has access to project
      const accessQuery = `
        SELECT p.id
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE p.id = $1 AND p.deleted_at IS NULL
          AND (p.owner_id = $2 OR pm.user_id = $2)
      `;

      const accessResult = await db.query(accessQuery, [projectId, userId]);

      if (accessResult.rows.length === 0) {
        throw new AppError('Project not found or access denied', 404);
      }

      // Generate unique conversation ID
      const conversationId = generateId();

      // Create conversation
      const query = `
        INSERT INTO conversations (id, title, project_id, user_id, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const result = await db.query(query, [
        conversationId,
        title,
        projectId,
        userId,
        JSON.stringify(metadata)
      ]);

      const conversation = result.rows[0];
      const parsedConversation = {
        ...conversation,
        metadata: typeof conversation.metadata === 'string' ? JSON.parse(conversation.metadata) : conversation.metadata
      };

      // Emit real-time event through WebSocket
      try {
        const io = getIO();
        if (io) {
          io.to(`project:${projectId}`).emit('conversation:created', {
            conversation: parsedConversation,
            projectId,
            timestamp: new Date()
          });
        }
      } catch (wsError) {
        console.error('Failed to broadcast conversation creation:', wsError);
      }

      return parsedConversation;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to create conversation: ${error.message}`, 500);
    }
  }

  /**
   * Get a single conversation with authorization check
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Conversation details
   */
  async getConversation(conversationId, userId) {
    try {
      const query = `
        SELECT
          c.*,
          p.name as project_name,
          u.name as creator_name,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL) as message_count
        FROM conversations c
        JOIN projects p ON c.project_id = p.id
        LEFT JOIN users u ON c.user_id = u.user_id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE c.id = $1 AND c.deleted_at IS NULL
          AND (p.owner_id = $2 OR pm.user_id = $2)
      `;

      const result = await db.query(query, [conversationId, userId]);

      if (result.rows.length === 0) {
        throw new AppError('Conversation not found or access denied', 404);
      }

      const conversation = result.rows[0];

      return {
        ...conversation,
        metadata: typeof conversation.metadata === 'string' ? JSON.parse(conversation.metadata) : conversation.metadata
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to get conversation: ${error.message}`, 500);
    }
  }

  /**
   * Update a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {Object} updates - Conversation updates
   * @returns {Promise<Object>} Updated conversation
   */
  async updateConversation(conversationId, userId, updates) {
    try {
      // Verify access
      await this.getConversation(conversationId, userId);

      // Build dynamic update query
      const allowedFields = ['title', 'metadata'];
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key) && updates[key] !== undefined) {
          updateFields.push(`${key} = $${paramCount}`);
          updateValues.push(key === 'metadata' ? JSON.stringify(updates[key]) : updates[key]);
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        throw new AppError('No valid fields to update', 400);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE conversations
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount} AND deleted_at IS NULL
        RETURNING *
      `;

      updateValues.push(conversationId);

      const result = await db.query(query, updateValues);

      if (result.rows.length === 0) {
        throw new AppError('Failed to update conversation', 500);
      }

      const conversation = result.rows[0];

      return {
        ...conversation,
        metadata: typeof conversation.metadata === 'string' ? JSON.parse(conversation.metadata) : conversation.metadata
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to update conversation: ${error.message}`, 500);
    }
  }

  /**
   * Delete a conversation (soft delete)
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteConversation(conversationId, userId) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Verify access
      const accessQuery = `
        SELECT c.id, p.owner_id, c.user_id
        FROM conversations c
        JOIN projects p ON c.project_id = p.id
        LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
        WHERE c.id = $1 AND c.deleted_at IS NULL
          AND (p.owner_id = $2 OR pm.user_id = $2)
      `;

      const accessResult = await client.query(accessQuery, [conversationId, userId]);

      if (accessResult.rows.length === 0) {
        throw new AppError('Conversation not found or access denied', 404);
      }

      const { owner_id, user_id: creatorId } = accessResult.rows[0];

      // Only owner or creator can delete
      if (owner_id !== userId && creatorId !== userId) {
        throw new AppError('Only conversation creator or project owner can delete', 403);
      }

      // Soft delete conversation
      await client.query(
        `UPDATE conversations SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [conversationId]
      );

      // Soft delete associated messages
      await client.query(
        `UPDATE messages SET deleted_at = CURRENT_TIMESTAMP WHERE conversation_id = $1`,
        [conversationId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to delete conversation: ${error.message}`, 500);
    } finally {
      client.release();
    }
  }

  /**
   * Send a message in a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {string} content - Message content
   * @param {Object} metadata - Additional metadata (role, citations, tokens, etc.)
   * @returns {Promise<Object>} Created message
   */
  async sendMessage(conversationId, userId, content, metadata = {}) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      if (!content) {
        throw new AppError('Message content is required', 400);
      }

      // Verify access to conversation
      const accessQuery = `
        SELECT c.id, c.project_id
        FROM conversations c
        JOIN projects p ON c.project_id = p.id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE c.id = $1 AND c.deleted_at IS NULL
          AND (p.owner_id = $2 OR pm.user_id = $2)
      `;

      const accessResult = await client.query(accessQuery, [conversationId, userId]);

      if (accessResult.rows.length === 0) {
        throw new AppError('Conversation not found or access denied', 404);
      }

      // Create message
      const messageId = generateId();
      const messageQuery = `
        INSERT INTO messages (id, conversation_id, user_id, content, role, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const role = metadata.role || 'user';
      const messageMetadata = { ...metadata };
      delete messageMetadata.role;

      const messageResult = await client.query(messageQuery, [
        messageId,
        conversationId,
        userId,
        content,
        role,
        JSON.stringify(messageMetadata)
      ]);

      // Update conversation updated_at
      await client.query(
        `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [conversationId]
      );

      await client.query('COMMIT');

      const message = messageResult.rows[0];
      const parsedMessage = {
        ...message,
        metadata: typeof message.metadata === 'string' ? JSON.parse(message.metadata) : message.metadata
      };

      // Emit real-time event through WebSocket
      try {
        const io = getIO();
        if (io) {
          const projectId = accessResult.rows[0].project_id;
          io.to(`conversation:${conversationId}`).emit('message:created', {
            conversationId,
            projectId,
            message: parsedMessage,
            timestamp: new Date()
          });
        }
      } catch (wsError) {
        // Log but don't throw - WebSocket events are optional
        console.error('Failed to broadcast message:', wsError);
      }

      return parsedMessage;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to send message: ${error.message}`, 500);
    } finally {
      client.release();
    }
  }

  /**
   * Get messages from a conversation (paginated)
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {number} limit - Number of messages to retrieve
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} Messages with pagination metadata
   */
  async getMessages(conversationId, userId, limit = 50, offset = 0) {
    try {
      // Verify access
      await this.getConversation(conversationId, userId);

      const query = `
        SELECT
          m.*,
          u.name as user_name,
          u.avatar_url as user_avatar
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.user_id
        WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
        ORDER BY m.created_at ASC
        LIMIT $2 OFFSET $3
      `;

      const result = await db.query(query, [conversationId, limit, offset]);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM messages
        WHERE conversation_id = $1 AND deleted_at IS NULL
      `;

      const countResult = await db.query(countQuery, [conversationId]);
      const total = parseInt(countResult.rows[0].total);

      return {
        messages: result.rows.map(msg => ({
          ...msg,
          metadata: typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to get messages: ${error.message}`, 500);
    }
  }

  /**
   * Update a message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @param {string} content - Updated content
   * @param {Object} metadata - Updated metadata
   * @returns {Promise<Object>} Updated message
   */
  async updateMessage(messageId, userId, content, metadata = null) {
    try {
      // Check if user owns the message
      const authQuery = `
        SELECT m.id, m.conversation_id, c.project_id, p.owner_id
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        JOIN projects p ON c.project_id = p.id
        WHERE m.id = $1 AND m.deleted_at IS NULL
      `;

      const authResult = await db.query(authQuery, [messageId]);

      if (authResult.rows.length === 0) {
        throw new AppError('Message not found', 404);
      }

      // Only allow updating own messages or if project owner
      const { owner_id } = authResult.rows[0];
      if (owner_id !== userId) {
        // Check if user owns this specific message
        const ownerCheck = await db.query(
          `SELECT id FROM messages WHERE id = $1 AND user_id = $2`,
          [messageId, userId]
        );

        if (ownerCheck.rows.length === 0) {
          throw new AppError('Insufficient permissions to update message', 403);
        }
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (content !== undefined && content !== null) {
        updateFields.push(`content = $${paramCount}`);
        updateValues.push(content);
        paramCount++;
      }

      if (metadata !== null) {
        updateFields.push(`metadata = $${paramCount}`);
        updateValues.push(JSON.stringify(metadata));
        paramCount++;
      }

      if (updateFields.length === 0) {
        throw new AppError('No valid fields to update', 400);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE messages
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount} AND deleted_at IS NULL
        RETURNING *
      `;

      updateValues.push(messageId);

      const result = await db.query(query, updateValues);

      if (result.rows.length === 0) {
        throw new AppError('Failed to update message', 500);
      }

      const message = result.rows[0];

      return {
        ...message,
        metadata: typeof message.metadata === 'string' ? JSON.parse(message.metadata) : message.metadata
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to update message: ${error.message}`, 500);
    }
  }

  /**
   * Delete a message (soft delete)
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteMessage(messageId, userId) {
    try {
      // Check if user owns the message
      const authQuery = `
        SELECT m.id, m.conversation_id, c.project_id, p.owner_id
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        JOIN projects p ON c.project_id = p.id
        WHERE m.id = $1 AND m.deleted_at IS NULL
      `;

      const authResult = await db.query(authQuery, [messageId]);

      if (authResult.rows.length === 0) {
        throw new AppError('Message not found', 404);
      }

      // Only allow deleting own messages or if project owner
      const { owner_id } = authResult.rows[0];
      if (owner_id !== userId) {
        // Check if user owns this specific message
        const ownerCheck = await db.query(
          `SELECT id FROM messages WHERE id = $1 AND user_id = $2`,
          [messageId, userId]
        );

        if (ownerCheck.rows.length === 0) {
          throw new AppError('Insufficient permissions to delete message', 403);
        }
      }

      // Soft delete message
      await db.query(
        `UPDATE messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [messageId]
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to delete message: ${error.message}`, 500);
    }
  }
}

module.exports = new ConversationService();
