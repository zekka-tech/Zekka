/**
 * Project Service
 * Handles project management operations with proper authorization
 *
 * Features:
 * - Project CRUD operations
 * - Member management (owner, editor, viewer roles)
 * - Project statistics and analytics
 * - Soft delete support
 * - Authorization checks
 */

const { AppError } = require('../utils/errors');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { getIO } = require('../middleware/websocket');

// Simple ID generator for compatibility
const generateId = () => {
  // Try to use uuid if available, otherwise use timestamp-based ID
  try {
    return uuidv4();
  } catch (e) {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

class ProjectService {
  /**
   * List projects for a user (owned + member projects)
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options (status, search)
   * @param {Object} pagination - Pagination options (limit, offset)
   * @returns {Promise<Object>} Projects list with metadata
   */
  async listProjects(userId, filters = {}, pagination = {}) {
    try {
      const { status, search } = filters;
      const { limit = 20, offset = 0 } = pagination;

      let query = `
        SELECT DISTINCT
          p.id,
          p.name,
          p.description,
          p.status,
          p.settings,
          p.created_at,
          p.updated_at,
          p.owner_id,
          u.name as owner_name,
          u.email as owner_email,
          pm.role as user_role,
          (SELECT COUNT(*) FROM conversations WHERE project_id = p.id AND deleted_at IS NULL) as conversation_count,
          (SELECT COUNT(*) FROM sources WHERE project_id = p.id AND deleted_at IS NULL) as source_count
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.user_id
        LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
        WHERE p.deleted_at IS NULL
          AND (p.owner_id = $1 OR pm.user_id = $1)
      `;

      const queryParams = [userId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND p.status = $${paramCount}`;
        queryParams.push(status);
      }

      if (search) {
        paramCount++;
        query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
      }

      query += ` ORDER BY p.updated_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE p.deleted_at IS NULL
          AND (p.owner_id = $1 OR pm.user_id = $1)
      `;

      const countParams = [userId];
      let countParamCount = 1;

      if (status) {
        countParamCount++;
        countQuery += ` AND p.status = $${countParamCount}`;
        countParams.push(status);
      }

      if (search) {
        countParamCount++;
        countQuery += ` AND (p.name ILIKE $${countParamCount} OR p.description ILIKE $${countParamCount})`;
        countParams.push(`%${search}%`);
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        projects: result.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      throw new AppError(`Failed to list projects: ${error.message}`, 500);
    }
  }

  /**
   * Create a new project
   * @param {string} userId - Owner user ID
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Created project
   */
  async createProject(userId, projectData) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const { name, description, settings = {} } = projectData;

      if (!name) {
        throw new AppError('Project name is required', 400);
      }

      // Generate unique project ID
      const projectId = generateId();

      // Create project
      const projectQuery = `
        INSERT INTO projects (id, name, description, owner_id, status, settings)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const projectResult = await client.query(projectQuery, [
        projectId,
        name,
        description || '',
        userId,
        'active',
        JSON.stringify(settings)
      ]);

      const project = projectResult.rows[0];

      // Add owner as member with owner role
      const memberId = generateId();
      const memberQuery = `
        INSERT INTO project_members (id, project_id, user_id, role)
        VALUES ($1, $2, $3, $4)
      `;

      await client.query(memberQuery, [memberId, project.id, userId, 'owner']);

      await client.query('COMMIT');

      const parsedProject = {
        ...project,
        settings: typeof project.settings === 'string' ? JSON.parse(project.settings) : project.settings
      };

      // Emit real-time event through WebSocket
      try {
        const io = getIO();
        if (io) {
          io.emit('project:created', {
            project: parsedProject,
            timestamp: new Date()
          });
        }
      } catch (wsError) {
        console.error('Failed to broadcast project creation:', wsError);
      }

      return parsedProject;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new AppError(`Failed to create project: ${error.message}`, 500);
    } finally {
      client.release();
    }
  }

  /**
   * Get a single project with authorization check
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Project details
   */
  async getProject(projectId, userId) {
    try {
      const query = `
        SELECT
          p.*,
          u.name as owner_name,
          u.email as owner_email,
          pm.role as user_role
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.user_id
        LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
        WHERE p.id = $1 AND p.deleted_at IS NULL
          AND (p.owner_id = $2 OR pm.user_id = $2)
      `;

      const result = await db.query(query, [projectId, userId]);

      if (result.rows.length === 0) {
        throw new AppError('Project not found or access denied', 404);
      }

      const project = result.rows[0];

      return {
        ...project,
        settings: typeof project.settings === 'string' ? JSON.parse(project.settings) : project.settings
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to get project: ${error.message}`, 500);
    }
  }

  /**
   * Update a project (owner/editor only)
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @param {Object} updates - Project updates
   * @returns {Promise<Object>} Updated project
   */
  async updateProject(projectId, userId, updates) {
    try {
      // Check authorization
      const authQuery = `
        SELECT pm.role, p.owner_id
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
        WHERE p.id = $1 AND p.deleted_at IS NULL
      `;

      const authResult = await db.query(authQuery, [projectId, userId]);

      if (authResult.rows.length === 0) {
        throw new AppError('Project not found', 404);
      }

      const { role, owner_id } = authResult.rows[0];
      const isOwner = owner_id === userId;
      const isEditor = role === 'editor';

      if (!isOwner && !isEditor) {
        throw new AppError('Insufficient permissions to update project', 403);
      }

      // Build dynamic update query
      const allowedFields = ['name', 'description', 'status', 'settings'];
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key) && updates[key] !== undefined) {
          updateFields.push(`${key} = $${paramCount}`);
          updateValues.push(key === 'settings' ? JSON.stringify(updates[key]) : updates[key]);
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        throw new AppError('No valid fields to update', 400);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE projects
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount} AND deleted_at IS NULL
        RETURNING *
      `;

      updateValues.push(projectId);

      const result = await db.query(query, updateValues);

      if (result.rows.length === 0) {
        throw new AppError('Failed to update project', 500);
      }

      const project = result.rows[0];

      const parsedProject = {
        ...project,
        settings: typeof project.settings === 'string' ? JSON.parse(project.settings) : project.settings
      };

      // Emit real-time event through WebSocket
      try {
        const io = getIO();
        if (io) {
          io.to(`project:${projectId}`).emit('project:updated', {
            project: parsedProject,
            timestamp: new Date()
          });
        }
      } catch (wsError) {
        console.error('Failed to broadcast project update:', wsError);
      }

      return parsedProject;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to update project: ${error.message}`, 500);
    }
  }

  /**
   * Delete a project (soft delete, owner only)
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteProject(projectId, userId) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Check if user is owner
      const authQuery = `
        SELECT owner_id FROM projects WHERE id = $1 AND deleted_at IS NULL
      `;

      const authResult = await client.query(authQuery, [projectId]);

      if (authResult.rows.length === 0) {
        throw new AppError('Project not found', 404);
      }

      if (authResult.rows[0].owner_id !== userId) {
        throw new AppError('Only project owner can delete the project', 403);
      }

      // Soft delete project
      await client.query(
        `UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [projectId]
      );

      // Soft delete associated conversations
      await client.query(
        `UPDATE conversations SET deleted_at = CURRENT_TIMESTAMP WHERE project_id = $1`,
        [projectId]
      );

      // Soft delete associated sources
      await client.query(
        `UPDATE sources SET deleted_at = CURRENT_TIMESTAMP WHERE project_id = $1`,
        [projectId]
      );

      await client.query('COMMIT');

      // Emit real-time event through WebSocket
      try {
        const io = getIO();
        if (io) {
          io.to(`project:${projectId}`).emit('project:deleted', {
            projectId,
            timestamp: new Date()
          });
        }
      } catch (wsError) {
        console.error('Failed to broadcast project deletion:', wsError);
      }
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to delete project: ${error.message}`, 500);
    } finally {
      client.release();
    }
  }

  /**
   * Get project statistics
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>} Project statistics
   */
  async getProjectStats(projectId, userId) {
    try {
      // Verify access
      await this.getProject(projectId, userId);

      const query = `
        SELECT
          (SELECT COUNT(*) FROM conversations WHERE project_id = $1 AND deleted_at IS NULL) as conversation_count,
          (SELECT COUNT(*) FROM messages m
           JOIN conversations c ON m.conversation_id = c.id
           WHERE c.project_id = $1 AND c.deleted_at IS NULL AND m.deleted_at IS NULL) as message_count,
          (SELECT COUNT(*) FROM sources WHERE project_id = $1 AND deleted_at IS NULL) as source_count,
          (SELECT COALESCE(SUM(input_tokens + output_tokens), 0) FROM token_usage WHERE project_id = $1) as total_tokens,
          (SELECT COALESCE(SUM(cost), 0) FROM cost_breakdown WHERE project_id = $1) as total_cost
      `;

      const result = await db.query(query, [projectId]);

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to get project stats: ${error.message}`, 500);
    }
  }

  /**
   * Add a member to a project
   * @param {string} projectId - Project ID
   * @param {string} userId - Current user ID (must be owner)
   * @param {string} newUserId - New member user ID
   * @param {string} role - Member role (editor, viewer)
   * @returns {Promise<Object>} Added member info
   */
  async addMember(projectId, userId, newUserId, role = 'viewer') {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Check if user is owner
      const authQuery = `
        SELECT owner_id FROM projects WHERE id = $1 AND deleted_at IS NULL
      `;

      const authResult = await client.query(authQuery, [projectId]);

      if (authResult.rows.length === 0) {
        throw new AppError('Project not found', 404);
      }

      if (authResult.rows[0].owner_id !== userId) {
        throw new AppError('Only project owner can add members', 403);
      }

      // Validate role
      const validRoles = ['owner', 'editor', 'viewer'];
      if (!validRoles.includes(role)) {
        throw new AppError('Invalid role. Must be owner, editor, or viewer', 400);
      }

      // Check if user exists
      const userQuery = `SELECT id, name, email FROM users WHERE id = $1`;
      const userResult = await client.query(userQuery, [newUserId]);

      if (userResult.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      // Check if already a member
      const memberCheck = await client.query(
        `SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [projectId, newUserId]
      );

      if (memberCheck.rows.length > 0) {
        throw new AppError('User is already a member of this project', 409);
      }

      // Add member
      const memberId = generateId();
      const insertQuery = `
        INSERT INTO project_members (id, project_id, user_id, role)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [memberId, projectId, newUserId, role]);

      await client.query('COMMIT');

      return {
        ...result.rows[0],
        user: userResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to add member: ${error.message}`, 500);
    } finally {
      client.release();
    }
  }

  /**
   * Remove a member from a project
   * @param {string} projectId - Project ID
   * @param {string} userId - Current user ID (must be owner)
   * @param {string} memberId - Member to remove
   * @returns {Promise<void>}
   */
  async removeMember(projectId, userId, memberId) {
    try {
      // Check if user is owner
      const authQuery = `
        SELECT owner_id FROM projects WHERE id = $1 AND deleted_at IS NULL
      `;

      const authResult = await db.query(authQuery, [projectId]);

      if (authResult.rows.length === 0) {
        throw new AppError('Project not found', 404);
      }

      if (authResult.rows[0].owner_id !== userId) {
        throw new AppError('Only project owner can remove members', 403);
      }

      // Don't allow removing the owner
      if (memberId === userId) {
        throw new AppError('Cannot remove project owner', 400);
      }

      // Remove member
      const deleteQuery = `
        DELETE FROM project_members
        WHERE project_id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await db.query(deleteQuery, [projectId, memberId]);

      if (result.rows.length === 0) {
        throw new AppError('Member not found in project', 404);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to remove member: ${error.message}`, 500);
    }
  }

  /**
   * Get project members with their roles
   * @param {string} projectId - Project ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Array>} List of members
   */
  async getProjectMembers(projectId, userId) {
    try {
      // Verify access
      await this.getProject(projectId, userId);

      const query = `
        SELECT
          pm.id,
          pm.role,
          pm.joined_at,
          u.id as user_id,
          u.name,
          u.email,
          u.avatar_url
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = $1
        ORDER BY
          CASE pm.role
            WHEN 'owner' THEN 1
            WHEN 'editor' THEN 2
            WHEN 'viewer' THEN 3
          END,
          pm.joined_at ASC
      `;

      const result = await db.query(query, [projectId]);

      return result.rows;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to get project members: ${error.message}`, 500);
    }
  }
}

module.exports = new ProjectService();
