/**
 * Projects Routes
 * API routes for project management
 *
 * Endpoints:
 * GET    /api/v1/projects           - List all projects
 * POST   /api/v1/projects           - Create a new project
 * GET    /api/v1/projects/:id       - Get a specific project
 * PUT    /api/v1/projects/:id       - Update a project
 * DELETE /api/v1/projects/:id       - Delete a project
 * GET    /api/v1/projects/:id/stats - Get project statistics
 * GET    /api/v1/projects/:id/members - Get project members
 * POST   /api/v1/projects/:id/members - Add a member
 * DELETE /api/v1/projects/:id/members/:userId - Remove a member
 */

const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projects.controller');
const projectSchemas = require('../schemas/projects.schema');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all project routes
router.use(authenticate);

/**
 * @route   GET /api/v1/projects
 * @desc    List all projects for authenticated user
 * @access  Private
 * @query   {string} [status] - Filter by status (active, archived, deleted)
 * @query   {string} [search] - Search in name and description
 * @query   {number} [limit=20] - Number of results per page
 * @query   {number} [offset=0] - Pagination offset
 */
router.get(
  '/',
  validateQuery(projectSchemas.listProjects),
  projectsController.listProjects
);

/**
 * @route   POST /api/v1/projects
 * @desc    Create a new project
 * @access  Private
 * @body    {string} name - Project name (required)
 * @body    {string} [description] - Project description
 * @body    {Object} [settings] - Project settings
 */
router.post(
  '/',
  validateBody(projectSchemas.createProject),
  projectsController.createProject
);

/**
 * @route   GET /api/v1/projects/:id
 * @desc    Get a specific project
 * @access  Private
 * @param   {string} id - Project UUID
 */
router.get(
  '/:id',
  validateParams(projectSchemas.projectId),
  projectsController.getProject
);

/**
 * @route   PUT /api/v1/projects/:id
 * @desc    Update a project (owner/editor only)
 * @access  Private
 * @param   {string} id - Project UUID
 * @body    {string} [name] - Updated project name
 * @body    {string} [description] - Updated description
 * @body    {string} [status] - Updated status
 * @body    {Object} [settings] - Updated settings
 */
router.put(
  '/:id',
  validateParams(projectSchemas.projectId),
  validateBody(projectSchemas.updateProject),
  projectsController.updateProject
);

/**
 * @route   DELETE /api/v1/projects/:id
 * @desc    Delete a project (soft delete, owner only)
 * @access  Private
 * @param   {string} id - Project UUID
 */
router.delete(
  '/:id',
  validateParams(projectSchemas.projectId),
  projectsController.deleteProject
);

/**
 * @route   GET /api/v1/projects/:id/stats
 * @desc    Get project statistics
 * @access  Private
 * @param   {string} id - Project UUID
 */
router.get(
  '/:id/stats',
  validateParams(projectSchemas.projectId),
  projectsController.getProjectStats
);

/**
 * @route   GET /api/v1/projects/:id/members
 * @desc    Get all members of a project
 * @access  Private
 * @param   {string} id - Project UUID
 */
router.get(
  '/:id/members',
  validateParams(projectSchemas.projectId),
  projectsController.getProjectMembers
);

/**
 * @route   POST /api/v1/projects/:id/members
 * @desc    Add a member to a project (owner only)
 * @access  Private
 * @param   {string} id - Project UUID
 * @body    {string} userId - User UUID to add
 * @body    {string} [role=viewer] - Member role (owner, editor, viewer)
 */
router.post(
  '/:id/members',
  validateParams(projectSchemas.projectId),
  validateBody(projectSchemas.addMember),
  projectsController.addMember
);

/**
 * @route   DELETE /api/v1/projects/:id/members/:userId
 * @desc    Remove a member from a project (owner only)
 * @access  Private
 * @param   {string} id - Project UUID
 * @param   {string} userId - User UUID to remove
 */
router.delete(
  '/:id/members/:userId',
  validateParams(projectSchemas.removeMember),
  projectsController.removeMember
);

module.exports = router;
