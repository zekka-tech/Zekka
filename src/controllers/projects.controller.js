/**
 * Projects Controller
 * Request handlers for project management endpoints
 *
 * Features:
 * - Request validation
 * - Error handling
 * - Response formatting
 * - Authorization integration
 */

const projectService = require('../services/project.service');
const { AppError } = require('../utils/errors');

class ProjectsController {
  /**
   * List all projects for the authenticated user
   * GET /api/v1/projects
   */
  async listProjects(req, res, next) {
    try {
      const { userId } = req.user;
      const {
        status, search, limit, offset
      } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (search) filters.search = search;

      const pagination = {
        limit: parseInt(limit) || 20,
        offset: parseInt(offset) || 0
      };

      const result = await projectService.listProjects(
        userId,
        filters,
        pagination
      );

      res.status(200).json({
        success: true,
        data: result.projects,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new project
   * POST /api/v1/projects
   */
  async createProject(req, res, next) {
    try {
      const { userId } = req.user;
      const { name, description, settings } = req.body;

      const project = await projectService.createProject(userId, {
        name,
        description,
        settings
      });

      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single project by ID
   * GET /api/v1/projects/:id
   */
  async getProject(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      const project = await projectService.getProject(id, userId);

      res.status(200).json({
        success: true,
        data: project
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a project
   * PUT /api/v1/projects/:id
   */
  async updateProject(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;
      const updates = req.body;

      const project = await projectService.updateProject(id, userId, updates);

      res.status(200).json({
        success: true,
        data: project,
        message: 'Project updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a project (soft delete)
   * DELETE /api/v1/projects/:id
   */
  async deleteProject(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      await projectService.deleteProject(id, userId);

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project statistics
   * GET /api/v1/projects/:id/stats
   */
  async getProjectStats(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      const stats = await projectService.getProjectStats(id, userId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project members
   * GET /api/v1/projects/:id/members
   */
  async getProjectMembers(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      const members = await projectService.getProjectMembers(id, userId);

      res.status(200).json({
        success: true,
        data: members
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a member to a project
   * POST /api/v1/projects/:id/members
   */
  async addMember(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;
      const { userId: newUserId, role } = req.body;

      const member = await projectService.addMember(
        id,
        userId,
        newUserId,
        role
      );

      res.status(201).json({
        success: true,
        data: member,
        message: 'Member added successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove a member from a project
   * DELETE /api/v1/projects/:id/members/:userId
   */
  async removeMember(req, res, next) {
    try {
      const { userId } = req.user;
      const { id, userId: memberId } = req.params;

      await projectService.removeMember(id, userId, memberId);

      res.status(200).json({
        success: true,
        message: 'Member removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProjectsController();
