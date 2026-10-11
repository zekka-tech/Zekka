/**
 * Sources Controller
 * Project knowledge-source management endpoints.
 *
 * Routes work against the real `sources` schema (id, project_id, user_id,
 * name, type, url, content, metadata, tenant_id). All operations are
 * access-controlled in the service (project owner/member + optional tenant).
 */

const Joi = require('joi');
const { getSourceService, SOURCE_TYPES } = require('../services/source.service');

const createSourceSchema = Joi.object({
  projectId: Joi.string().required(),
  name: Joi.string().min(1).max(255).optional(),
  type: Joi.string().valid(...SOURCE_TYPES).optional(),
  url: Joi.string().uri().optional(),
  content: Joi.string().max(1_000_000).optional(),
  metadata: Joi.object().optional()
}).options({ allowUnknown: false, stripUnknown: true });

const updateSourceSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  url: Joi.string().uri().optional().allow(null),
  content: Joi.string().max(1_000_000).optional().allow(null),
  metadata: Joi.object().optional()
}).min(1).options({ allowUnknown: false, stripUnknown: true });

const sourceService = getSourceService();

class SourcesController {
  /**
   * List sources for a project
   * GET /api/v1/sources?projectId=:projectId&type=&limit=&offset=
   */
  async listSources(req, res, next) {
    try {
      const { userId } = req.user;
      const {
        projectId, type, limit, offset
      } = req.query;

      if (!projectId) {
        return res.status(400).json({ success: false, error: 'projectId is required' });
      }

      const result = await sourceService.listSources(
        projectId,
        userId,
        { type, limit, offset },
        req.tenant?.id || null
      );

      return res.status(200).json({
        success: true,
        data: result.sources,
        pagination: result.pagination
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Create a source (text/url/github/… or an uploaded file's text content)
   * POST /api/v1/sources
   */
  async uploadSource(req, res, next) {
    try {
      const { userId } = req.user;
      const { file } = req;

      const { error, value } = createSourceSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details.map((d) => d.message).join('; ')
        });
      }

      const source = await sourceService.createSource(userId, {
        ...value,
        type: value.type || (file ? 'file' : 'text'),
        file,
        tenantId: req.tenant?.id || null
      });

      return res.status(201).json({
        success: true,
        data: source,
        message: 'Source created successfully'
      });
    } catch (error) {
      return next(error);
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

      const source = await sourceService.getSource(id, userId, req.tenant?.id || null);

      return res.status(200).json({ success: true, data: source });
    } catch (error) {
      return next(error);
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

      const { error, value } = updateSourceSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details.map((d) => d.message).join('; ')
        });
      }

      const source = await sourceService.updateSource(
        id,
        userId,
        value,
        req.tenant?.id || null
      );

      return res.status(200).json({
        success: true,
        data: source,
        message: 'Source updated successfully'
      });
    } catch (error) {
      return next(error);
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

      await sourceService.deleteSource(id, userId, req.tenant?.id || null);

      return res.status(200).json({
        success: true,
        message: 'Source deleted successfully'
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Search sources in a project
   * GET /api/v1/sources/search?projectId=:projectId&q=:query&type=&limit=
   */
  async searchSources(req, res, next) {
    try {
      const { userId } = req.user;
      const {
        projectId, q: query, type, limit
      } = req.query;

      if (!projectId) {
        return res.status(400).json({ success: false, error: 'projectId is required' });
      }

      const results = await sourceService.searchSources(
        projectId,
        userId,
        query || '',
        { limit, type },
        req.tenant?.id || null
      );

      return res.status(200).json({ success: true, data: results });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get source statistics for a project
   * GET /api/v1/sources/:projectId/stats
   */
  async getSourceStats(req, res, next) {
    try {
      const { userId } = req.user;
      const { projectId } = req.params;

      const stats = await sourceService.getSourceStats(
        projectId,
        userId,
        req.tenant?.id || null
      );

      return res.status(200).json({ success: true, data: stats });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new SourcesController();
