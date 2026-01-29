/**
 * Sources Controller
 * Handles file/source upload and management endpoints
 */

const { getSourceService } = require('../services/source.service');

const sourceService = getSourceService();

class SourcesController {
  /**
   * List sources for a project
   * GET /api/v1/sources?projectId=:projectId
   */
  async listSources(req, res, next) {
    try {
      const { userId } = req.user;
      const {
        projectId, type, limit = 20, offset = 0
      } = req.query;

      const filters = { type };
      const pagination = { limit: parseInt(limit, 10), offset: parseInt(offset, 10) };

      const result = await sourceService.listSources(
        userId,
        projectId,
        filters,
        pagination
      );

      res.status(200).json({
        success: true,
        data: result.sources,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload a source file
   * POST /api/v1/sources
   */
  async uploadSource(req, res, next) {
    try {
      const { userId } = req.user;
      const {
        projectId, name, type, url, metadata
      } = req.body;
      const { file } = req;

      const source = await sourceService.createSource(userId, {
        projectId,
        name: name || file?.originalname,
        type: type || file?.mimetype,
        url,
        file,
        metadata
      });

      res.status(201).json({
        success: true,
        data: source,
        message: 'Source uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific source
   * GET /api/v1/sources/:id
   */
  async getSource(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      const source = await sourceService.getSource(id, userId);

      res.status(200).json({
        success: true,
        data: source
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a source
   * PUT /api/v1/sources/:id
   */
  async updateSource(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;
      const updates = req.body;

      const source = await sourceService.updateSource(id, userId, updates);

      res.status(200).json({
        success: true,
        data: source,
        message: 'Source updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a source
   * DELETE /api/v1/sources/:id
   */
  async deleteSource(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      await sourceService.deleteSource(id, userId);

      res.status(200).json({
        success: true,
        message: 'Source deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download a source
   * GET /api/v1/sources/:id/download
   */
  async downloadSource(req, res, next) {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      const source = await sourceService.getSourceFile(id, userId);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${source.name}"`
      );
      res.setHeader('Content-Type', source.type);
      res.send(source.content);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get source statistics
   * GET /api/v1/sources/:projectId/stats
   */
  async getSourceStats(req, res, next) {
    try {
      const { userId } = req.user;
      const { projectId } = req.params;

      const stats = await sourceService.getSourceStats(projectId, userId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List folders for a project
   * GET /api/v1/sources/folders?projectId=:projectId
   */
  async listFolders(req, res, next) {
    try {
      const { projectId } = req.query;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'projectId is required'
        });
      }

      const folders = await sourceService.getFolderTree(projectId);

      return res.status(200).json({
        success: true,
        data: folders
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Create a folder
   * POST /api/v1/sources/folders
   */
  async createFolder(req, res, next) {
    try {
      const { projectId, name, parentId } = req.body;

      if (!projectId || !name) {
        return res.status(400).json({
          success: false,
          error: 'projectId and name are required'
        });
      }

      const folder = await sourceService.createFolder(projectId, {
        name,
        parentFolderId: parentId,
        metadata: {}
      });

      return res.status(201).json({
        success: true,
        data: folder,
        message: 'Folder created successfully'
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Search sources in a project
   * GET /api/v1/sources/search?projectId=:projectId&q=:query
   */
  async searchSources(req, res, next) {
    try {
      const {
        projectId, q: query, type, limit = 50
      } = req.query;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'projectId is required'
        });
      }

      const results = await sourceService.searchSources(projectId, query || '', {
        limit: parseInt(limit, 10),
        type
      });

      return res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new SourcesController();
