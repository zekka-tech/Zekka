/**
 * Source Service
 *
 * Manages project "sources" — knowledge inputs attached to a project
 * (uploaded text/files, URLs, GitHub repos, databases, APIs). Backed by the
 * `sources` table: (id, project_id, user_id, name, type, url, content,
 * metadata, tenant_id, timestamps, deleted_at).
 *
 * Every operation is access-controlled: the acting user must own the project
 * or be a project member, and (when a tenant context is active) the project
 * must belong to that tenant.
 */

const Fuse = require('fuse.js');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');

const SOURCE_TYPES = ['file', 'url', 'text', 'github', 'database', 'api'];

const generateId = () => {
  try {
    return uuidv4();
  } catch {
    return `src_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
};

class SourceService {
  /**
   * Resolve a project the user may access (owner or active member), optionally
   * constrained to a tenant. Returns the project row or null.
   */
  async getAccessibleProject(projectId, userId, tenantId = null, querier = pool) {
    const params = [projectId, userId];
    let sql = `
      SELECT DISTINCT p.id, p.tenant_id
      FROM projects p
      LEFT JOIN project_members pm
        ON pm.project_id = p.id AND pm.is_active = TRUE
      WHERE p.id = $1
        AND p.deleted_at IS NULL
        AND (p.owner_id = $2 OR pm.user_id = $2)`;
    if (tenantId) {
      params.push(tenantId);
      sql += ' AND p.tenant_id = $3';
    }
    const result = await querier.query(sql, params);
    return result.rows[0] || null;
  }

  async assertProjectAccess(projectId, userId, tenantId = null) {
    const project = await this.getAccessibleProject(projectId, userId, tenantId);
    if (!project) {
      const err = new Error('Project not found or access denied');
      err.statusCode = 404;
      throw err;
    }
    return project;
  }

  /**
   * List sources for a project.
   * @returns {Promise<{sources: Array, pagination: {limit,offset,total}}>}
   */
  async listSources(projectId, userId, options = {}, tenantId = null) {
    await this.assertProjectAccess(projectId, userId, tenantId);

    const { type = null } = options;
    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 20, 1), 100);
    const offset = Math.max(parseInt(options.offset, 10) || 0, 0);

    const where = ['s.project_id = $1', 's.deleted_at IS NULL'];
    const params = [projectId];
    if (type) {
      params.push(type);
      where.push(`s.type = $${params.length}`);
    }
    if (tenantId) {
      params.push(tenantId);
      where.push(`s.tenant_id = $${params.length}`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM sources s WHERE ${where.join(' AND ')}`,
      params
    );
    const total = countResult.rows[0]?.total ?? 0;

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT s.id, s.project_id, s.user_id, s.name, s.type, s.url,
              s.content, s.metadata, s.created_at, s.updated_at
       FROM sources s
       WHERE ${where.join(' AND ')}
       ORDER BY s.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      sources: result.rows,
      pagination: { limit, offset, total }
    };
  }

  /**
   * Create a source. For an uploaded file, its UTF-8 text is stored in
   * `content` (the schema has no binary storage); url/text/etc. map directly.
   */
  async createSource(userId, data = {}) {
    const {
      projectId,
      name,
      type = 'text',
      url = null,
      content = null,
      metadata = {},
      file = null,
      tenantId = null
    } = data;

    if (!projectId) {
      const err = new Error('projectId is required');
      err.statusCode = 400;
      throw err;
    }
    await this.assertProjectAccess(projectId, userId, tenantId);

    const resolvedType = SOURCE_TYPES.includes(type) ? type : 'text';
    const resolvedName = name || file?.originalname || `${resolvedType}-source`;
    const resolvedContent = file?.buffer ? file.buffer.toString('utf8') : content;
    const resolvedMeta = {
      ...metadata,
      ...(file
        ? { originalName: file.originalname, mimeType: file.mimetype, size: file.size }
        : {})
    };

    const id = generateId();
    const result = await pool.query(
      `INSERT INTO sources
         (id, project_id, user_id, name, type, url, content, metadata, tenant_id,
          created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, NOW(), NOW())
       RETURNING *`,
      [
        id, projectId, userId, resolvedName, resolvedType, url,
        resolvedContent, JSON.stringify(resolvedMeta), tenantId
      ]
    );
    return result.rows[0];
  }

  /** Get a single source the user can access (via project ownership/membership). */
  async getSource(sourceId, userId, tenantId = null) {
    const params = [sourceId, userId];
    let sql = `
      SELECT DISTINCT s.*
      FROM sources s
      JOIN projects p ON p.id = s.project_id
      LEFT JOIN project_members pm
        ON pm.project_id = p.id AND pm.is_active = TRUE
      WHERE s.id = $1
        AND s.deleted_at IS NULL
        AND (p.owner_id = $2 OR pm.user_id = $2)`;
    if (tenantId) {
      params.push(tenantId);
      sql += ' AND s.tenant_id = $3';
    }
    const result = await pool.query(sql, params);
    const source = result.rows[0];
    if (!source) {
      const err = new Error('Source not found');
      err.statusCode = 404;
      throw err;
    }
    return source;
  }

  /** Update mutable fields of a source. */
  async updateSource(sourceId, userId, updates = {}, tenantId = null) {
    const existing = await this.getSource(sourceId, userId, tenantId);

    const name = updates.name ?? existing.name;
    const url = updates.url ?? existing.url;
    const content = updates.content ?? existing.content;
    const metadata = updates.metadata
      ? JSON.stringify({ ...existing.metadata, ...updates.metadata })
      : JSON.stringify(existing.metadata);

    const result = await pool.query(
      `UPDATE sources
       SET name = $2, url = $3, content = $4, metadata = $5::jsonb, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [sourceId, name, url, content, metadata]
    );
    return result.rows[0];
  }

  /** Soft-delete a source. */
  async deleteSource(sourceId, userId, tenantId = null) {
    await this.getSource(sourceId, userId, tenantId); // authorizes or throws 404
    await pool.query(
      'UPDATE sources SET deleted_at = NOW() WHERE id = $1',
      [sourceId]
    );
    return true;
  }

  /** Fuzzy-search a project's sources by name/content. */
  async searchSources(projectId, userId, query, options = {}, tenantId = null) {
    await this.assertProjectAccess(projectId, userId, tenantId);

    const { type = null } = options;
    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 50, 1), 200);

    const where = ['s.project_id = $1', 's.deleted_at IS NULL'];
    const params = [projectId];
    if (type) {
      params.push(type);
      where.push(`s.type = $${params.length}`);
    }
    if (tenantId) {
      params.push(tenantId);
      where.push(`s.tenant_id = $${params.length}`);
    }

    const result = await pool.query(
      `SELECT s.id, s.project_id, s.name, s.type, s.url, s.content,
              s.metadata, s.created_at, s.updated_at
       FROM sources s
       WHERE ${where.join(' AND ')}
       ORDER BY s.created_at DESC`,
      params
    );

    if (!query || query.trim() === '') {
      return result.rows.slice(0, limit);
    }

    const fuse = new Fuse(result.rows, {
      keys: ['name', 'content'],
      threshold: 0.3,
      includeScore: true
    });
    return fuse.search(query).slice(0, limit).map((r) => r.item);
  }

  /** Per-type counts + total for a project. */
  async getSourceStats(projectId, userId, tenantId = null) {
    await this.assertProjectAccess(projectId, userId, tenantId);

    const where = ['project_id = $1', 'deleted_at IS NULL'];
    const params = [projectId];
    if (tenantId) {
      params.push(tenantId);
      where.push(`tenant_id = $${params.length}`);
    }

    const result = await pool.query(
      `SELECT type, COUNT(*)::int AS count
       FROM sources
       WHERE ${where.join(' AND ')}
       GROUP BY type`,
      params
    );

    const byType = {};
    let total = 0;
    for (const row of result.rows) {
      byType[row.type || 'unknown'] = row.count;
      total += row.count;
    }
    return { total, byType };
  }
}

let sourceServiceInstance = null;

function getSourceService() {
  if (!sourceServiceInstance) {
    sourceServiceInstance = new SourceService();
  }
  return sourceServiceInstance;
}

module.exports = {
  SourceService,
  getSourceService,
  SOURCE_TYPES
};
