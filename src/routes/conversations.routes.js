/**
 * Conversations Routes
 * API routes for conversation and message management
 *
 * Endpoints:
 * GET    /api/v1/conversations              - List all conversations
 * POST   /api/v1/conversations              - Create a new conversation
 * GET    /api/v1/conversations/:id          - Get a specific conversation
 * PUT    /api/v1/conversations/:id          - Update a conversation
 * DELETE /api/v1/conversations/:id          - Delete a conversation
 * GET    /api/v1/conversations/:id/messages - Get messages from a conversation
 * POST   /api/v1/conversations/:id/messages - Send a message
 * POST   /api/v1/conversations/:id/messages/stream - Send message with streaming
 * PUT    /api/v1/conversations/:id/messages/:msgId - Update a message
 * DELETE /api/v1/conversations/:id/messages/:msgId - Delete a message
 */

const express = require('express');
const router = express.Router();
const conversationsController = require('../controllers/conversations.controller');
const conversationSchemas = require('../schemas/conversations.schema');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all conversation routes
router.use(authenticate);

/**
 * @route   GET /api/v1/conversations
 * @desc    List all conversations for authenticated user
 * @access  Private
 * @query   {string} [projectId] - Filter by project UUID
 * @query   {number} [limit=20] - Number of results per page
 * @query   {number} [offset=0] - Pagination offset
 */
router.get(
  '/',
  validateQuery(conversationSchemas.listConversations),
  conversationsController.listConversations
);

/**
 * @route   POST /api/v1/conversations
 * @desc    Create a new conversation
 * @access  Private
 * @body    {string} title - Conversation title (required)
 * @body    {string} projectId - Project UUID (required)
 * @body    {Object} [metadata] - Additional metadata
 */
router.post(
  '/',
  validateBody(conversationSchemas.createConversation),
  conversationsController.createConversation
);

/**
 * @route   GET /api/v1/conversations/:id
 * @desc    Get a specific conversation
 * @access  Private
 * @param   {string} id - Conversation UUID
 */
router.get(
  '/:id',
  validateParams(conversationSchemas.conversationId),
  conversationsController.getConversation
);

/**
 * @route   PUT /api/v1/conversations/:id
 * @desc    Update a conversation
 * @access  Private
 * @param   {string} id - Conversation UUID
 * @body    {string} [title] - Updated title
 * @body    {Object} [metadata] - Updated metadata
 */
router.put(
  '/:id',
  validateParams(conversationSchemas.conversationId),
  validateBody(conversationSchemas.updateConversation),
  conversationsController.updateConversation
);

/**
 * @route   DELETE /api/v1/conversations/:id
 * @desc    Archive a conversation (soft delete)
 * @access  Private
 * @param   {string} id - Conversation UUID
 */
router.delete(
  '/:id',
  validateParams(conversationSchemas.conversationId),
  conversationsController.deleteConversation
);

/**
 * @route   GET /api/v1/conversations/:id/messages
 * @desc    Get messages from a conversation (paginated)
 * @access  Private
 * @param   {string} id - Conversation UUID
 * @query   {number} [limit=50] - Number of messages to retrieve
 * @query   {number} [offset=0] - Pagination offset
 */
router.get(
  '/:id/messages',
  validateParams(conversationSchemas.conversationId),
  validateQuery(conversationSchemas.getMessages),
  conversationsController.getMessages
);

/**
 * @route   POST /api/v1/conversations/:id/messages
 * @desc    Send a message in a conversation
 * @access  Private
 * @param   {string} id - Conversation UUID
 * @body    {string} content - Message content (required)
 * @body    {string} [role=user] - Message role (user, assistant, system)
 * @body    {Object} [metadata] - Message metadata (citations, tokens, etc.)
 */
router.post(
  '/:id/messages',
  validateParams(conversationSchemas.conversationId),
  validateBody(conversationSchemas.sendMessage),
  conversationsController.sendMessage
);

/**
 * @route   POST /api/v1/conversations/:id/messages/stream
 * @desc    Send a message with streaming AI response (Server-Sent Events)
 * @access  Private
 * @param   {string} id - Conversation UUID
 * @body    {string} content - Message content (required)
 * @body    {string} [role=user] - Message role
 * @body    {Object} [metadata] - Message metadata
 */
router.post(
  '/:id/messages/stream',
  validateParams(conversationSchemas.conversationId),
  validateBody(conversationSchemas.sendMessage),
  conversationsController.sendMessageStream
);

/**
 * @route   PUT /api/v1/conversations/:id/messages/:msgId
 * @desc    Update a message (owner or project owner only)
 * @access  Private
 * @param   {string} id - Conversation UUID
 * @param   {string} msgId - Message UUID
 * @body    {string} [content] - Updated content
 * @body    {Object} [metadata] - Updated metadata
 */
router.put(
  '/:id/messages/:msgId',
  validateParams(conversationSchemas.messageId),
  validateBody(conversationSchemas.updateMessage),
  conversationsController.updateMessage
);

/**
 * @route   DELETE /api/v1/conversations/:id/messages/:msgId
 * @desc    Delete a message (soft delete, owner or project owner only)
 * @access  Private
 * @param   {string} id - Conversation UUID
 * @param   {string} msgId - Message UUID
 */
router.delete(
  '/:id/messages/:msgId',
  validateParams(conversationSchemas.messageId),
  conversationsController.deleteMessage
);

module.exports = router;
