/**
 * Analytics Controller
 * Handles analytics and metrics endpoints
 */

const { getAnalyticsService } = require('../services/analytics.service');
const { AppError } = require('../utils/errors');

const analyticsService = getAnalyticsService();

class AnalyticsController {
  /**
   * Get project analytics
   * GET /api/v1/analytics/:projectId
   */
  async getProjectAnalytics(req, res, next) {
    try {
      const { projectId } = req.params;
      const { userId } = req.user;
      const { period = 'month' } = req.query;

      const analytics = await analyticsService.getProjectAnalytics(
        projectId,
        period
      );

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get token usage
   * GET /api/v1/analytics/:projectId/tokens
   */
  async getTokenUsage(req, res, next) {
    try {
      const { projectId } = req.params;
      const { userId } = req.user;
      const { period = 'month' } = req.query;

      const usage = await analyticsService.getTokenUsage(projectId, period);

      res.status(200).json({
        success: true,
        data: usage
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cost breakdown
   * GET /api/v1/analytics/:projectId/costs
   */
  async getCostBreakdown(req, res, next) {
    try {
      const { projectId } = req.params;
      const { userId } = req.user;

      const costs = await analyticsService.getCostsBreakdown(projectId);

      res.status(200).json({
        success: true,
        data: costs
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get metrics
   * GET /api/v1/analytics/metrics
   */
  async getMetrics(req, res, next) {
    try {
      const { userId } = req.user;
      const { period = 'month' } = req.query;

      const metrics = await analyticsService.getMetrics(userId, period);

      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get agent metrics
   * GET /api/v1/analytics/agents/:agentId
   */
  async getAgentMetrics(req, res, next) {
    try {
      const { agentId } = req.params;
      const { period = 'month' } = req.query;

      const metrics = await analyticsService.getAgentMetrics(agentId, period);

      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
