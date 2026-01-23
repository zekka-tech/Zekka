/**
 * Analytics Routes
 * API routes for analytics and metrics endpoints
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all analytics routes
router.use(authenticate);

/**
 * @route   GET /api/v1/analytics/metrics
 * @desc    Get user metrics
 * @access  Private
 */
router.get('/metrics', analyticsController.getMetrics);

/**
 * @route   GET /api/v1/analytics/:projectId
 * @desc    Get project analytics
 * @access  Private
 * @param   {string} projectId - Project ID
 */
router.get('/:projectId', analyticsController.getProjectAnalytics);

/**
 * @route   GET /api/v1/analytics/:projectId/tokens
 * @desc    Get project token usage
 * @access  Private
 * @param   {string} projectId - Project ID
 */
router.get('/:projectId/tokens', analyticsController.getTokenUsage);

/**
 * @route   GET /api/v1/analytics/:projectId/costs
 * @desc    Get project cost breakdown
 * @access  Private
 * @param   {string} projectId - Project ID
 */
router.get('/:projectId/costs', analyticsController.getCostBreakdown);

/**
 * @route   GET /api/v1/analytics/agents/:agentId
 * @desc    Get agent metrics
 * @access  Private
 * @param   {string} agentId - Agent ID
 */
router.get('/agents/:agentId', analyticsController.getAgentMetrics);

module.exports = router;
