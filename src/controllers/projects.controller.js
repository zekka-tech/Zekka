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

class ProjectsController {
  /**
   * List all projects for the authenticated user
   * GET /api/v1/projects
   */
  async listProjects(req, res) {
    const { userId } = req.user;
    const {
      status, search, limit, offset
    } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (search) filters.search = search;
    if (req.tenant) filters.tenantId = req.tenant.id;

    const pagination = {
      limit: parseInt(limit, 10) || 20,
      offset: parseInt(offset, 10) || 0
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
  }

  /**
   * Create a new project
   * POST /api/v1/projects
   */
  async createProject(req, res) {
    const { userId } = req.user;
    const { name, description, settings } = req.body;

    const project = await projectService.createProject(userId, {
      name,
      description,
      settings,
      tenantId: req.tenant?.id
    });

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully'
    });
  }

  /**
   * Get a single project by ID
   * GET /api/v1/projects/:id
   */
  async getProject(req, res) {
    const { userId } = req.user;
    const { id } = req.params;

    const project = await projectService.getProject(id, userId);

    res.status(200).json({
      success: true,
      data: project
    });
  }

  /**
   * Update a project
   * PUT /api/v1/projects/:id
   */
  async updateProject(req, res) {
    const { userId } = req.user;
    const { id } = req.params;
    const updates = req.body;

    const project = await projectService.updateProject(id, userId, updates);

    res.status(200).json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  }

  /**
   * Delete a project (soft delete)
   * DELETE /api/v1/projects/:id
   */
  async deleteProject(req, res) {
    const { userId } = req.user;
    const { id } = req.params;

    await projectService.deleteProject(id, userId);

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  }

  /**
   * Archive a project (owner/admin only)
   * PATCH /api/v1/projects/:id/archive
   */
  async archiveProject(req, res) {
    const { userId } = req.user;
    const { id } = req.params;
    const project = await projectService.archiveProject(id, userId);
    res.status(200).json({
      success: true,
      data: project,
      message: 'Project archived successfully'
    });
  }

  /**
   * Get project statistics
   * GET /api/v1/projects/:id/stats
   */
  async getProjectStats(req, res) {
    const { userId } = req.user;
    const { id } = req.params;

    const stats = await projectService.getProjectStats(id, userId);

    res.status(200).json({
      success: true,
      data: stats
    });
  }

  /**
   * Get project members
   * GET /api/v1/projects/:id/members
   */
  async getProjectMembers(req, res) {
    const { userId } = req.user;
    const { id } = req.params;

    const members = await projectService.getProjectMembers(id, userId);

    res.status(200).json({
      success: true,
      data: members
    });
  }

  /**
   * Add a member to a project
   * POST /api/v1/projects/:id/members
   */
  async addMember(req, res) {
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
  }

  /**
   * Remove a member from a project
   * DELETE /api/v1/projects/:id/members/:userId
   */
  async removeMember(req, res) {
    const { userId } = req.user;
    const { id, userId: memberId } = req.params;

    await projectService.removeMember(id, userId, memberId);

    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });
  }
}

module.exports = new ProjectsController();
