/**
 * Agents Routes
 * API routes for agent management endpoints
 */

const express = require('express');

const router = express.Router();
const agentsController = require('../controllers/agents.controller');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all agent routes
router.use(authenticate);

/**
 * @route   GET /api/v1/agents
 * @desc    List all agents for a project
 * @access  Private
 * @query   {string} projectId - Project ID
 * @query   {string} [status] - Filter by status (active, inactive, failed)
 * @query   {number} [limit=20] - Results per page
 * @query   {number} [offset=0] - Pagination offset
 */
router.get('/', agentsController.listAgents);

/**
 * @route   POST /api/v1/agents
 * @desc    Create a new agent
 * @access  Private
 * @body    {string} projectId - Project ID
 * @body    {string} name - Agent name
 * @body    {string} type - Agent type (e.g., 'qa', 'code-review', 'documentation')
 * @body    {Object} [config] - Agent configuration
 * @body    {string} [description] - Agent description
 */
router.post('/', agentsController.createAgent);

/**
 * @route   GET /api/v1/agents/:id
 * @desc    Get a specific agent
 * @access  Private
 * @param   {string} id - Agent ID
 */
router.get('/:id', agentsController.getAgent);

/**
 * @route   PUT /api/v1/agents/:id
 * @desc    Update an agent
 * @access  Private
 * @param   {string} id - Agent ID
 * @body    {string} [name] - Updated agent name
 * @body    {string} [status] - Updated status
 * @body    {Object} [config] - Updated configuration
 */
router.put('/:id', agentsController.updateAgent);

/**
 * @route   DELETE /api/v1/agents/:id
 * @desc    Delete an agent
 * @access  Private
 * @param   {string} id - Agent ID
 */
router.delete('/:id', agentsController.deleteAgent);

/**
 * @route   POST /api/v1/agents/:id/start
 * @desc    Start an agent
 * @access  Private
 * @param   {string} id - Agent ID
 */
router.post('/:id/start', agentsController.startAgent);

/**
 * @route   POST /api/v1/agents/:id/stop
 * @desc    Stop an agent
 * @access  Private
 * @param   {string} id - Agent ID
 */
router.post('/:id/stop', agentsController.stopAgent);

/**
 * @route   GET /api/v1/agents/:id/activity
 * @desc    Get agent activity log
 * @access  Private
 * @param   {string} id - Agent ID
 * @query   {number} [limit=50] - Results per page
 * @query   {number} [offset=0] - Pagination offset
 */
router.get('/:id/activity', agentsController.getAgentActivity);

module.exports = router;
