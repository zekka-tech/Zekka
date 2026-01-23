/**
 * Source Service
 *
 * Manages files and folders for projects
 * Includes upload, download, search, and organization capabilities
 */

const { pool } = require('../config/database');
const { uploadFile, deleteFile, getFileStream, fileExists } = require('../utils/file-storage');
const Fuse = require('fuse.js');

class SourceService {
  /**
   * List sources (files and folders) in a project
   * @param {number} projectId - Project ID
   * @param {number|null} folderId - Parent folder ID (null for root)
   * @param {object} options - Listing options
   * @returns {Promise<object>} Files and folders
   */
  async listSources(projectId, folderId = null, options = {}) {
    const { includeDeleted = false, sortBy = 'name', sortOrder = 'ASC' } = options;

    // Validate sort parameters
    const validSortFields = ['name', 'created_at', 'updated_at', 'size', 'type'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const query = `
      SELECT
        s.id,
        s.project_id,
        s.folder_id,
        s.name,
        s.type,
        s.file_path,
        s.file_size,
        s.mime_type,
        s.metadata,
        s.created_at,
        s.updated_at,
        s.deleted_at,
        u.email as uploaded_by_email
      FROM sources s
      LEFT JOIN users u ON u.id = s.uploaded_by
      WHERE s.project_id = $1
        AND s.folder_id ${folderId ? '= $2' : 'IS NULL'}
        ${!includeDeleted ? 'AND s.deleted_at IS NULL' : ''}
      ORDER BY
        CASE WHEN s.type = 'folder' THEN 0 ELSE 1 END,
        ${sortField} ${order}
    `;

    const params = folderId ? [projectId, folderId] : [projectId];
    const result = await pool.query(query, params);

    // Separate folders and files
    const folders = result.rows.filter(item => item.type === 'folder');
    const files = result.rows.filter(item => item.type === 'file');

    return {
      folders,
      files,
      total: result.rows.length,
      totalFolders: folders.length,
      totalFiles: files.length
    };
  }

  /**
   * Upload a file
   * @param {number} projectId - Project ID
   * @param {number} userId - User ID
   * @param {object} file - File object with buffer and metadata
   * @param {number|null} folderId - Parent folder ID
   * @returns {Promise<object>} Uploaded file record
   */
  async uploadFile(projectId, userId, file, folderId = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify project exists and user has access
      const projectCheck = await client.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      );

      if (projectCheck.rows.length === 0) {
        throw new Error('Project not found or access denied');
      }

      // Verify folder if specified
      if (folderId) {
        const folderCheck = await client.query(
          'SELECT id FROM sources WHERE id = $1 AND project_id = $2 AND type = $3',
          [folderId, projectId, 'folder']
        );

        if (folderCheck.rows.length === 0) {
          throw new Error('Folder not found');
        }
      }

      // Upload file to storage
      const uploadResult = await uploadFile(
        file.buffer,
        file.originalname,
        { subfolder: `project_${projectId}`, validate: true }
      );

      // Insert file record into database
      const query = `
        INSERT INTO sources (
          project_id,
          folder_id,
          name,
          type,
          file_path,
          file_size,
          mime_type,
          uploaded_by,
          metadata,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, 'file', $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `;

      const metadata = {
        originalName: file.originalname,
        storageType: uploadResult.storageType,
        uploadedAt: uploadResult.uploadedAt
      };

      const result = await client.query(query, [
        projectId,
        folderId,
        file.originalname,
        uploadResult.relativePath,
        uploadResult.size,
        file.mimetype,
        userId,
        JSON.stringify(metadata)
      ]);

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ File upload failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get source details
   * @param {number} sourceId - Source ID
   * @param {number} projectId - Project ID (for access control)
   * @returns {Promise<object|null>} Source details
   */
  async getSource(sourceId, projectId) {
    const query = `
      SELECT
        s.*,
        u.email as uploaded_by_email,
        u.username as uploaded_by_username
      FROM sources s
      LEFT JOIN users u ON u.id = s.uploaded_by
      WHERE s.id = $1 AND s.project_id = $2 AND s.deleted_at IS NULL
    `;

    const result = await pool.query(query, [sourceId, projectId]);
    return result.rows[0] || null;
  }

  /**
   * Delete a source (soft delete)
   * @param {number} sourceId - Source ID
   * @param {number} projectId - Project ID (for access control)
   * @returns {Promise<boolean>} Success status
   */
  async deleteSource(sourceId, projectId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get source details
      const sourceQuery = `
        SELECT id, type, file_path
        FROM sources
        WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL
      `;

      const sourceResult = await client.query(sourceQuery, [sourceId, projectId]);

      if (sourceResult.rows.length === 0) {
        throw new Error('Source not found');
      }

      const source = sourceResult.rows[0];

      // If it's a folder, delete all contents recursively
      if (source.type === 'folder') {
        await this._deleteFolderContents(client, sourceId, projectId);
      }

      // Soft delete the source
      await client.query(
        'UPDATE sources SET deleted_at = NOW() WHERE id = $1',
        [sourceId]
      );

      // Delete physical file if it's a file
      if (source.type === 'file' && source.file_path) {
        await deleteFile(source.file_path);
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Failed to delete source:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search sources in a project
   * @param {number} projectId - Project ID
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async searchSources(projectId, query, options = {}) {
    const { limit = 50, type = null } = options;

    // Get all sources in project
    const dbQuery = `
      SELECT
        s.id,
        s.project_id,
        s.folder_id,
        s.name,
        s.type,
        s.file_path,
        s.file_size,
        s.mime_type,
        s.metadata,
        s.created_at,
        s.updated_at
      FROM sources s
      WHERE s.project_id = $1
        AND s.deleted_at IS NULL
        ${type ? 'AND s.type = $2' : ''}
      ORDER BY s.created_at DESC
    `;

    const params = type ? [projectId, type] : [projectId];
    const result = await pool.query(dbQuery, params);

    // If no query, return all (limited)
    if (!query || query.trim() === '') {
      return result.rows.slice(0, limit);
    }

    // Use Fuse.js for fuzzy search
    const fuse = new Fuse(result.rows, {
      keys: ['name', 'metadata'],
      threshold: 0.3,
      includeScore: true
    });

    const searchResults = fuse.search(query);
    return searchResults.slice(0, limit).map(result => result.item);
  }

  /**
   * Create a folder
   * @param {number} projectId - Project ID
   * @param {object} folderData - Folder data
   * @returns {Promise<object>} Created folder
   */
  async createFolder(projectId, folderData) {
    const { name, parentFolderId = null, metadata = {} } = folderData;

    // Verify parent folder if specified
    if (parentFolderId) {
      const parentCheck = await pool.query(
        'SELECT id FROM sources WHERE id = $1 AND project_id = $2 AND type = $3',
        [parentFolderId, projectId, 'folder']
      );

      if (parentCheck.rows.length === 0) {
        throw new Error('Parent folder not found');
      }
    }

    // Check if folder with same name exists
    const existsCheck = await pool.query(
      'SELECT id FROM sources WHERE project_id = $1 AND folder_id $2 AND name = $3 AND type = $4 AND deleted_at IS NULL',
      [projectId, parentFolderId ? `= ${parentFolderId}` : 'IS NULL', name, 'folder']
    );

    if (existsCheck.rows.length > 0) {
      throw new Error('Folder with this name already exists');
    }

    const query = `
      INSERT INTO sources (
        project_id,
        folder_id,
        name,
        type,
        metadata,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, 'folder', $4, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [
      projectId,
      parentFolderId,
      name,
      JSON.stringify(metadata)
    ]);

    return result.rows[0];
  }

  /**
   * Delete a folder and all its contents
   * @param {number} folderId - Folder ID
   * @param {number} projectId - Project ID (for access control)
   * @returns {Promise<object>} Deletion result
   */
  async deleteFolder(folderId, projectId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify folder exists
      const folderCheck = await client.query(
        'SELECT id FROM sources WHERE id = $1 AND project_id = $2 AND type = $3 AND deleted_at IS NULL',
        [folderId, projectId, 'folder']
      );

      if (folderCheck.rows.length === 0) {
        throw new Error('Folder not found');
      }

      // Delete all contents recursively
      const deletedCount = await this._deleteFolderContents(client, folderId, projectId);

      // Delete the folder itself
      await client.query(
        'UPDATE sources SET deleted_at = NOW() WHERE id = $1',
        [folderId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        deletedCount: deletedCount + 1
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Failed to delete folder:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get folder tree/hierarchy
   * @param {number} projectId - Project ID
   * @returns {Promise<Array>} Folder tree
   */
  async getFolderTree(projectId) {
    const query = `
      WITH RECURSIVE folder_tree AS (
        -- Base case: root folders
        SELECT
          id,
          name,
          folder_id as parent_id,
          0 as level,
          ARRAY[id] as path
        FROM sources
        WHERE project_id = $1
          AND type = 'folder'
          AND folder_id IS NULL
          AND deleted_at IS NULL

        UNION ALL

        -- Recursive case: child folders
        SELECT
          s.id,
          s.name,
          s.folder_id as parent_id,
          ft.level + 1,
          ft.path || s.id
        FROM sources s
        INNER JOIN folder_tree ft ON s.folder_id = ft.id
        WHERE s.project_id = $1
          AND s.type = 'folder'
          AND s.deleted_at IS NULL
      )
      SELECT * FROM folder_tree
      ORDER BY path
    `;

    const result = await pool.query(query, [projectId]);
    return result.rows;
  }

  /**
   * Move source to different folder
   * @param {number} sourceId - Source ID
   * @param {number} projectId - Project ID
   * @param {number|null} newFolderId - New folder ID (null for root)
   * @returns {Promise<object>} Updated source
   */
  async moveSource(sourceId, projectId, newFolderId) {
    // Verify source exists
    const source = await this.getSource(sourceId, projectId);
    if (!source) {
      throw new Error('Source not found');
    }

    // Verify new folder if specified
    if (newFolderId) {
      const folderCheck = await pool.query(
        'SELECT id FROM sources WHERE id = $1 AND project_id = $2 AND type = $3 AND deleted_at IS NULL',
        [newFolderId, projectId, 'folder']
      );

      if (folderCheck.rows.length === 0) {
        throw new Error('Target folder not found');
      }

      // Prevent moving folder into itself or its descendants
      if (source.type === 'folder') {
        const descendants = await this._getFolderDescendants(sourceId);
        if (descendants.includes(newFolderId)) {
          throw new Error('Cannot move folder into itself or its descendants');
        }
      }
    }

    const query = `
      UPDATE sources
      SET folder_id = $1, updated_at = NOW()
      WHERE id = $2 AND project_id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [newFolderId, sourceId, projectId]);
    return result.rows[0];
  }

  /**
   * Delete folder contents recursively
   * @private
   */
  async _deleteFolderContents(client, folderId, projectId) {
    // Get all direct children
    const childrenQuery = `
      SELECT id, type, file_path
      FROM sources
      WHERE folder_id = $1 AND project_id = $2 AND deleted_at IS NULL
    `;

    const childrenResult = await client.query(childrenQuery, [folderId, projectId]);
    let deletedCount = 0;

    for (const child of childrenResult.rows) {
      // If child is a folder, recursively delete its contents
      if (child.type === 'folder') {
        deletedCount += await this._deleteFolderContents(client, child.id, projectId);
      }

      // Soft delete the child
      await client.query(
        'UPDATE sources SET deleted_at = NOW() WHERE id = $1',
        [child.id]
      );

      // Delete physical file if it's a file
      if (child.type === 'file' && child.file_path) {
        await deleteFile(child.file_path);
      }

      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * Get all descendants of a folder
   * @private
   */
  async _getFolderDescendants(folderId) {
    const query = `
      WITH RECURSIVE descendants AS (
        SELECT id, folder_id
        FROM sources
        WHERE folder_id = $1 AND deleted_at IS NULL

        UNION ALL

        SELECT s.id, s.folder_id
        FROM sources s
        INNER JOIN descendants d ON s.folder_id = d.id
        WHERE s.deleted_at IS NULL
      )
      SELECT id FROM descendants
    `;

    const result = await pool.query(query, [folderId]);
    return result.rows.map(row => row.id);
  }
}

// Singleton instance
let sourceServiceInstance = null;

/**
 * Get source service instance
 */
function getSourceService() {
  if (!sourceServiceInstance) {
    sourceServiceInstance = new SourceService();
  }
  return sourceServiceInstance;
}

module.exports = {
  SourceService,
  getSourceService
};
