/**
 * Agents Controller
 * Handles agent management endpoints
 */

const agentService = require('../services/agent.service');
const { AppError } = require('../utils/errors');

class AgentsController {
  /**
   * List agents for a project
   * GET /api/v1/agents?projectId=:projectId
   */
  async listAgents(req, res, next) {
    try {
      const { userId } = req.user;
      const {
        projectId, status, limit = 20, offset = 0
      } = req.query;

      const filters = { status };
      const pagination = { limit: parseInt(limit), offset: parseInt(offset) };

      const result = await agentService.listAgents(
        userId,
        projectId,
        filters,
        pagination
      );

      res.status(200).json({
        success: true,
        data: result.agents,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create an agent
   * POST /api/v1/agents
   */
  async createAgent(req, res, next) {
    try {
      const { userId } = req.user;
      const {
        projectId, name, type, config, description
      } = req.body;

      const agent = await agentService.createAgent(userId, {
        projectId,
        name,
        type,
        config,
        description
      });

      res.status(201).json({
        success: true,
        data: agent,
        message: 'Agent created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific agent
   * GET /api/v1/agents/:id
   */
  async getAgent(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      const agent = await agentService.getAgent(id, userId);

      res.status(200).json({
        success: true,
        data: agent
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an agent
   * PUT /api/v1/agents/:id
   */
  async updateAgent(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;
      const updates = req.body;

      const agent = await agentService.updateAgent(id, userId, updates);

      res.status(200).json({
        success: true,
        data: agent,
        message: 'Agent updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an agent
   * DELETE /api/v1/agents/:id
   */
  async deleteAgent(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      await agentService.deleteAgent(id, userId);

      res.status(200).json({
        success: true,
        message: 'Agent deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Start an agent
   * POST /api/v1/agents/:id/start
   */
  async startAgent(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      const agent = await agentService.startAgent(id, userId);

      res.status(200).json({
        success: true,
        data: agent,
        message: 'Agent started successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stop an agent
   * POST /api/v1/agents/:id/stop
   */
  async stopAgent(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      const agent = await agentService.stopAgent(id, userId);

      res.status(200).json({
        success: true,
        data: agent,
        message: 'Agent stopped successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get agent activity
   * GET /api/v1/agents/:id/activity
   */
  async getAgentActivity(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const activity = await agentService.getAgentActivity(id, userId, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.status(200).json({
        success: true,
        data: activity
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AgentsController();
