/**
 * Sources Routes
 * API routes for file/source management endpoints
 */

const express = require('express');

const router = express.Router();
const sourcesController = require('../controllers/sources.controller');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all source routes
router.use(authenticate);

/**
 * @route   GET /api/v1/sources
 * @desc    List all sources for a project
 * @access  Private
 * @query   {string} projectId - Project ID
 * @query   {string} [type] - Filter by type (pdf, txt, url, etc.)
 * @query   {number} [limit=20] - Results per page
 * @query   {number} [offset=0] - Pagination offset
 */
router.get('/', sourcesController.listSources);

/**
 * @route   POST /api/v1/sources
 * @desc    Upload a new source file
 * @access  Private
 * @body    {string} projectId - Project ID
 * @body    {string} name - Source name
 * @body    {string} [type] - Source type (pdf, txt, url, etc.)
 * @body    {string} [url] - URL if source is from a URL
 * @body    {Object} [metadata] - Additional metadata
 */
router.post('/', sourcesController.uploadSource);

/**
 * @route   GET /api/v1/sources/:id
 * @desc    Get a specific source
 * @access  Private
 * @param   {string} id - Source ID
 */
router.get('/:id', sourcesController.getSource);

/**
 * @route   PUT /api/v1/sources/:id
 * @desc    Update a source
 * @access  Private
 * @param   {string} id - Source ID
 * @body    {string} [name] - Updated name
 * @body    {Object} [metadata] - Updated metadata
 */
router.put('/:id', sourcesController.updateSource);

/**
 * @route   DELETE /api/v1/sources/:id
 * @desc    Delete a source
 * @access  Private
 * @param   {string} id - Source ID
 */
router.delete('/:id', sourcesController.deleteSource);

/**
 * @route   GET /api/v1/sources/:id/download
 * @desc    Download a source file
 * @access  Private
 * @param   {string} id - Source ID
 */
router.get('/:id/download', sourcesController.downloadSource);

/**
 * @route   GET /api/v1/sources/folders
 * @desc    List folders for a project
 * @access  Private
 * @query   {string} projectId - Project ID
 */
router.get('/folders', sourcesController.listFolders);

/**
 * @route   POST /api/v1/sources/folders
 * @desc    Create a new folder
 * @access  Private
 * @body    {string} projectId - Project ID
 * @body    {string} name - Folder name
 * @body    {string} [parentId] - Parent folder ID
 */
router.post('/folders', sourcesController.createFolder);

/**
 * @route   GET /api/v1/sources/search
 * @desc    Search sources in a project
 * @access  Private
 * @query   {string} projectId - Project ID
 * @query   {string} q - Search query
 * @query   {string} [type] - Filter by type
 * @query   {number} [limit=50] - Results limit
 */
router.get('/search', sourcesController.searchSources);

/**
 * @route   GET /api/v1/sources/:projectId/stats
 * @desc    Get source statistics for a project
 * @access  Private
 * @param   {string} projectId - Project ID
 */
router.get('/:projectId/stats', sourcesController.getSourceStats);

module.exports = router;
