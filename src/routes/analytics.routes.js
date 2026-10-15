/**
 * Analytics Routes
 * API routes for analytics and metrics endpoints
 */

const express = require('express');

const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { asyncHandler } = require('../middleware/error-handler.middleware');
const { authenticate } = require('../middleware/auth');
const { optionalTenantContext } = require('../middleware/tenant-context');

// Apply authentication to all analytics routes
router.use(authenticate);
// Resolve optional tenant context (no-op without an X-Tenant-Id header)
router.use(optionalTenantContext);

/**
 * @route   GET /api/v1/analytics/metrics
 * @desc    Get user metrics
 * @access  Private
 */
router.get('/metrics', asyncHandler(analyticsController.getMetrics));

/**
 * @route   GET /api/v1/analytics/costs
 * @desc    Get user cost summary
 * @access  Private
 */
router.get('/costs', asyncHandler(analyticsController.getCosts));

/**
 * @route   GET /api/v1/analytics/costs/breakdown
 * @desc    Get user cost timeline breakdown
 * @access  Private
 */
router.get('/costs/breakdown', asyncHandler(analyticsController.getCostsBreakdown));

/**
 * @route   GET /api/v1/analytics/agents/:agentId
 * @desc    Get agent metrics
 * @access  Private
 * @param   {string} agentId - Agent ID
 *
 * NOTE: must be registered before /:projectId so Express does not treat
 * "agents" as a projectId value.
 */
router.get('/agents/:agentId', asyncHandler(analyticsController.getAgentMetrics));

/**
 * @route   GET /api/v1/analytics/:projectId
 * @desc    Get project analytics
 * @access  Private
 * @param   {string} projectId - Project ID
 */
router.get('/:projectId', asyncHandler(analyticsController.getProjectAnalytics));

/**
 * @route   GET /api/v1/analytics/:projectId/tokens
 * @desc    Get project token usage
 * @access  Private
 * @param   {string} projectId - Project ID
 */
router.get('/:projectId/tokens', asyncHandler(analyticsController.getTokenUsage));

/**
 * @route   GET /api/v1/analytics/:projectId/costs
 * @desc    Get project cost breakdown
 * @access  Private
 * @param   {string} projectId - Project ID
 */
router.get('/:projectId/costs', asyncHandler(analyticsController.getCostBreakdown));

module.exports = router;
