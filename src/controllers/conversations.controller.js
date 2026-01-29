/**
 * Conversations Controller
 * Request handlers for conversation and message endpoints
 *
 * Features:
 * - Request validation
 * - Error handling
 * - Response formatting
 * - Streaming response support for AI messages
 * - Authorization integration
 */

const conversationService = require('../services/conversation.service');
const { AppError } = require('../utils/errors');

class ConversationsController {
  /**
   * List all conversations for the authenticated user
   * GET /api/v1/conversations
   */
  async listConversations(req, res, next) {
    try {
      const { userId } = req.user;
      const { projectId, limit, offset } = req.query;

      const pagination = {
        limit: parseInt(limit) || 20,
        offset: parseInt(offset) || 0
      };

      const result = await conversationService.listConversations(
        userId,
        projectId,
        pagination
      );

      res.status(200).json({
        success: true,
        data: result.conversations,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new conversation
   * POST /api/v1/conversations
   */
  async createConversation(req, res, next) {
    try {
      const { userId } = req.user;
      const { title, projectId, metadata } = req.body;

      const conversation = await conversationService.createConversation(
        userId,
        projectId,
        title,
        metadata
      );

      res.status(201).json({
        success: true,
        data: conversation,
        message: 'Conversation created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single conversation by ID
   * GET /api/v1/conversations/:id
   */
  async getConversation(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      const conversation = await conversationService.getConversation(
        id,
        userId
      );

      res.status(200).json({
        success: true,
        data: conversation
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a conversation
   * PUT /api/v1/conversations/:id
   */
  async updateConversation(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;
      const updates = req.body;

      const conversation = await conversationService.updateConversation(
        id,
        userId,
        updates
      );

      res.status(200).json({
        success: true,
        data: conversation,
        message: 'Conversation updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a conversation (soft delete)
   * DELETE /api/v1/conversations/:id
   */
  async deleteConversation(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      await conversationService.deleteConversation(id, userId);

      res.status(200).json({
        success: true,
        message: 'Conversation archived successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages from a conversation
   * GET /api/v1/conversations/:id/messages
   */
  async getMessages(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;
      const { limit, offset } = req.query;

      const result = await conversationService.getMessages(
        id,
        userId,
        parseInt(limit) || 50,
        parseInt(offset) || 0
      );

      res.status(200).json({
        success: true,
        data: result.messages,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a message in a conversation
   * POST /api/v1/conversations/:id/messages
   */
  async sendMessage(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;
      const { content, role, metadata } = req.body;

      const messageMetadata = {
        ...metadata,
        role
      };

      const message = await conversationService.sendMessage(
        id,
        userId,
        content,
        messageMetadata
      );

      res.status(201).json({
        success: true,
        data: message,
        message: 'Message sent successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a message with streaming AI response
   * POST /api/v1/conversations/:id/messages/stream
   *
   * This endpoint supports Server-Sent Events (SSE) for streaming AI responses
   */
  async sendMessageStream(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;
      const { content, role, metadata } = req.body;

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Save user message first
      const messageMetadata = {
        ...metadata,
        role: role || 'user'
      };

      const userMessage = await conversationService.sendMessage(
        id,
        userId,
        content,
        messageMetadata
      );

      // Send user message confirmation
      res.write(
        `data: ${JSON.stringify({
          type: 'userMessage',
          data: userMessage
        })}\n\n`
      );

      // In a real implementation, this would integrate with AI service
      // For now, we'll create a placeholder for the streaming logic

      // Example streaming response structure:
      // The actual AI integration would go here
      res.write(
        `data: ${JSON.stringify({
          type: 'info',
          message: 'AI streaming integration pending - implement in AI service'
        })}\n\n`
      );

      // Send completion event
      res.write(
        `data: ${JSON.stringify({
          type: 'done'
        })}\n\n`
      );

      res.end();
    } catch (error) {
      // For streaming, we need to send error in SSE format
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }

      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          error: error.message || 'Failed to send message'
        })}\n\n`
      );

      res.end();
    }
  }

  /**
   * Update a message
   * PUT /api/v1/conversations/:id/messages/:msgId
   */
  async updateMessage(req, res, next) {
    try {
      const { userId } = req.user;
      const { msgId } = req.params;
      const { content, metadata } = req.body;

      const message = await conversationService.updateMessage(
        msgId,
        userId,
        content,
        metadata
      );

      res.status(200).json({
        success: true,
        data: message,
        message: 'Message updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a message (soft delete)
   * DELETE /api/v1/conversations/:id/messages/:msgId
   */
  async deleteMessage(req, res, next) {
    try {
      const { userId } = req.user;
      const { msgId } = req.params;

      await conversationService.deleteMessage(msgId, userId);

      res.status(200).json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConversationsController();
