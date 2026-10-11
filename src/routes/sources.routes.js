/**
 * Sources Routes
 * API routes for project knowledge-source management.
 */

const express = require('express');

const router = express.Router();
const sourcesController = require('../controllers/sources.controller');
const { authenticate } = require('../middleware/auth');
const { optionalTenantContext } = require('../middleware/tenant-context');

// Apply authentication to all source routes
router.use(authenticate);
// Resolve optional tenant context (no-op without an X-Tenant-Id header)
router.use(optionalTenantContext);

/**
 * @route   GET /api/v1/sources?projectId=:projectId
 * @desc    List sources for a project
 */
router.get('/', sourcesController.listSources);

/**
 * @route   POST /api/v1/sources
 * @desc    Create a source (text/url/github/database/api, or uploaded file text)
 */
router.post('/', sourcesController.uploadSource);

// NOTE: the static /search segment MUST be declared before the parameterised
// /:id route or Express would match it as id="search".

/**
 * @route   GET /api/v1/sources/search?projectId=:projectId&q=:query
 * @desc    Fuzzy-search sources in a project
 */
router.get('/search', sourcesController.searchSources);

/**
 * @route   GET /api/v1/sources/:projectId/stats
 * @desc    Source statistics for a project
 */
router.get('/:projectId/stats', sourcesController.getSourceStats);

/**
 * @route   GET /api/v1/sources/:id
 * @desc    Get a specific source
 */
router.get('/:id', sourcesController.getSource);

/**
 * @route   PUT /api/v1/sources/:id
 * @desc    Update a source
 */
router.put('/:id', sourcesController.updateSource);

/**
 * @route   DELETE /api/v1/sources/:id
 * @desc    Delete a source (soft delete)
 */
router.delete('/:id', sourcesController.deleteSource);

module.exports = router;
