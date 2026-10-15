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

const path = require('path');
const { uploadFile } = require('../utils/file-storage');
const conversationService = require('../services/conversation.service');
const { validateUploadedFile } = require('../utils/upload-validation');

class ConversationsController {
  writeSseEvent(res, payload) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    if (typeof res.flush === 'function') {
      res.flush();
    }
  }

  streamAssistantResponse(res, turnResult) {
    const { userMessage, assistantMessage } = turnResult;
    const content = assistantMessage.content || '';
    const chunkSize = 160;

    this.writeSseEvent(res, {
      type: 'userMessage',
      data: userMessage
    });

    this.writeSseEvent(res, {
      type: 'assistantMessageStart',
      data: {
        ...assistantMessage,
        content: ''
      }
    });

    for (let index = 0; index < content.length; index += chunkSize) {
      this.writeSseEvent(res, {
        type: 'assistantMessageDelta',
        data: {
          id: assistantMessage.id,
          conversationId: assistantMessage.conversation_id,
          chunk: content.slice(index, index + chunkSize)
        }
      });
    }

    this.writeSseEvent(res, {
      type: 'assistantMessageComplete',
      data: assistantMessage
    });

    this.writeSseEvent(res, { type: 'done' });
  }

  /**
   * List all conversations for the authenticated user
   * GET /api/v1/conversations
   */
  async listConversations(req, res) {
    const { userId } = req.user;
    const { projectId, limit, offset } = req.query;

    const pagination = {
      limit: Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100),
      offset: Math.max(parseInt(offset, 10) || 0, 0)
    };

    const result = await conversationService.listConversations(
      userId,
      projectId,
      pagination,
      req.tenant?.id || null
    );

    res.status(200).json({
      success: true,
      data: result.conversations,
      pagination: result.pagination
    });
  }

  /**
   * Create a new conversation
   * POST /api/v1/conversations
   */
  async createConversation(req, res) {
    const { userId } = req.user;
    const { title, projectId, metadata } = req.body;

    const conversation = await conversationService.createConversation(
      userId,
      projectId,
      title,
      metadata,
      req.tenant?.id || null
    );

    res.status(201).json({
      success: true,
      data: conversation,
      message: 'Conversation created successfully'
    });
  }

  /**
   * Get a single conversation by ID
   * GET /api/v1/conversations/:id
   */
  async getConversation(req, res) {
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
  }

  /**
   * Update a conversation
   * PUT /api/v1/conversations/:id
   */
  async updateConversation(req, res) {
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
  }

  /**
   * Delete a conversation (soft delete)
   * DELETE /api/v1/conversations/:id
   */
  async deleteConversation(req, res) {
    const { userId } = req.user;
    const { id } = req.params;

    await conversationService.deleteConversation(id, userId);

    res.status(200).json({
      success: true,
      message: 'Conversation archived successfully'
    });
  }

  /**
   * Get messages from a conversation
   * GET /api/v1/conversations/:id/messages
   */
  async getMessages(req, res) {
    const { userId } = req.user;
    const { id } = req.params;
    const { limit, offset } = req.query;

    const result = await conversationService.getMessages(
      id,
      userId,
      Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200),
      Math.max(parseInt(offset, 10) || 0, 0)
    );

    res.status(200).json({
      success: true,
      data: result.messages,
      pagination: result.pagination
    });
  }

  /**
   * Send a message in a conversation
   * POST /api/v1/conversations/:id/messages
   */
  async sendMessage(req, res) {
    const { userId } = req.user;
    const { id } = req.params;
    const { content, metadata } = req.body;

    const turnResult = await conversationService.sendMessageTurn(
      id,
      userId,
      content,
      metadata || {}
    );

    res.status(201).json({
      success: true,
      data: turnResult,
      userMessage: turnResult.userMessage,
      assistantMessage: turnResult.assistantMessage,
      message: 'Message sent successfully'
    });
  }

  /**
   * Send a message with streaming AI response
   * POST /api/v1/conversations/:id/messages/stream
   *
   * This endpoint supports Server-Sent Events (SSE) for streaming AI responses
   */
  async sendMessageStream(req, res, _next) {
    // Commit SSE headers synchronously before any async work so the catch
    // block can always write an error event without hitting "headers already sent"
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    try {
      const { userId } = req.user;
      const { id } = req.params;
      const { content, metadata } = req.body;

      await conversationService.sendMessageTurnStream(
        id,
        userId,
        content,
        metadata || {},
        {
          onUserMessage: async (userMessage) => {
            this.writeSseEvent(res, { type: 'userMessage', data: userMessage });
          },
          onAssistantStart: async (assistantMessage) => {
            this.writeSseEvent(res, { type: 'assistantMessageStart', data: assistantMessage });
          },
          onAssistantDelta: async (delta) => {
            this.writeSseEvent(res, { type: 'assistantMessageDelta', data: delta });
          },
          onAssistantComplete: async (assistantMessage) => {
            this.writeSseEvent(res, { type: 'assistantMessageComplete', data: assistantMessage });
          }
        }
      );

      this.writeSseEvent(res, { type: 'done' });
      res.end();
    } catch (error) {
      // Headers already committed — must send error as SSE event, not HTTP status
      this.writeSseEvent(res, {
        type: 'error',
        error: error.message || 'Failed to send message'
      });
      res.end();
    }
  }

  /**
   * Update a message
   * PUT /api/v1/conversations/:id/messages/:msgId
   */
  async updateMessage(req, res) {
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
  }

  /**
   * Upload file attachment for a conversation
   * POST /api/v1/conversations/:id/attachments
   */
  async uploadAttachment(req, res) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const {
      originalname, mimetype, size, buffer
    } = req.file;
    await validateUploadedFile(req.file);

    if (size > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File exceeds 10MB limit' });
    }

    const conversationId = req.params.id;
    const result = await uploadFile(buffer, originalname, {
      subfolder: `conversations/${conversationId}`,
      mimeType: mimetype
    });

    return res.status(201).json({
      success: true,
      data: {
        url: result.url || result.path,
        key: result.key || result.filename,
        filename: path.basename(result.filename || originalname),
        size,
        mimeType: mimetype
      },
      message: 'File uploaded successfully'
    });
  }

  /**
   * Delete a message (soft delete)
   * DELETE /api/v1/conversations/:id/messages/:msgId
   */
  async deleteMessage(req, res) {
    const { userId } = req.user;
    const { msgId } = req.params;

    await conversationService.deleteMessage(msgId, userId);

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  }
}

module.exports = new ConversationsController();
