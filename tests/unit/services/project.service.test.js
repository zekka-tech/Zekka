/**
 * Project Service Unit Tests
 *
 * Covers: listProjects, createProject, getProject, deleteProject,
 * updateProject, and authorization guards.
 *
 * db.query (and the transactional client returned by db.getClient) are mocked
 * so no real database connection is needed.
 */

// ── Mock heavy side-effectful dependencies ────────────────────────────────────

jest.mock('../../../src/config/database', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn()
  };

  const db = {
    query: jest.fn(),
    getClient: jest.fn().mockResolvedValue(mockClient),
    _mockClient: mockClient
  };

  return db;
});

jest.mock('../../../src/middleware/websocket', () => ({
  getIO: jest.fn().mockReturnValue(null)
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const db = require('../../../src/config/database');
const projectService = require('../../../src/services/project.service');
const { AppError } = require('../../../src/utils/errors');
const {
  createRandomProject,
  createProjectData
} = require('../../fixtures/project.fixtures');

describe('ProjectService', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = db._mockClient;
    // Reset the shared client mock the factory returns
    db.getClient.mockResolvedValue(mockClient);
  });

  // ─── listProjects ──────────────────────────────────────────────────────────

  describe('listProjects', () => {
    it('returns a projects array and a pagination object', async () => {
      const fakeProjects = [createRandomProject(), createRandomProject()];

      db.query
        .mockResolvedValueOnce({ rows: fakeProjects }) // main SELECT
        .mockResolvedValueOnce({ rows: [{ total: '2' }] }); // COUNT query

      const result = await projectService.listProjects('user-1');

      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.projects)).toBe(true);
      expect(result.projects).toHaveLength(2);
    });

    it('pagination object reflects the supplied limit and offset', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const result = await projectService.listProjects(
        'user-1',
        {},
        { limit: 5, offset: 10 }
      );

      expect(result.pagination.limit).toBe(5);
      expect(result.pagination.offset).toBe(10);
    });

    it('filters by status when the status filter is provided', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      await projectService.listProjects('user-1', { status: 'active' });

      // The first db.query call should include the status value in its params
      const [, queryParams] = db.query.mock.calls[0];
      expect(queryParams).toContain('active');
    });

    it('passes a search term to the query when supplied', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      await projectService.listProjects('user-1', { search: 'alpha' });

      const [, queryParams] = db.query.mock.calls[0];
      expect(queryParams).toContain('%alpha%');
    });

    it('hasMore is true when offset + limit is less than total', async () => {
      const fakeProjects = Array.from({ length: 5 }, createRandomProject);

      db.query
        .mockResolvedValueOnce({ rows: fakeProjects })
        .mockResolvedValueOnce({ rows: [{ total: '20' }] });

      const result = await projectService.listProjects(
        'user-1',
        {},
        { limit: 5, offset: 0 }
      );

      expect(result.pagination.hasMore).toBe(true);
    });
  });

  // ─── createProject ─────────────────────────────────────────────────────────

  describe('createProject', () => {
    it('inserts a project row and an owner member row, then returns the project', async () => {
      const projectData = createProjectData();
      const fakeRow = {
        id: 'proj-new',
        ...projectData,
        owner_id: 'user-1',
        status: 'active',
        settings: JSON.stringify(projectData.settings || {})
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [fakeRow] }) // INSERT projects
        .mockResolvedValueOnce({ rows: [] }) // INSERT project_members
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await projectService.createProject('user-1', projectData);

      expect(result).toMatchObject({ id: 'proj-new', status: 'active' });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('throws AppError when project name is missing', async () => {
      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      // The service will throw before reaching COMMIT — ROLLBACK is called
      mockClient.query.mockResolvedValue(undefined);

      await expect(
        projectService.createProject('user-1', { description: 'No name' })
      ).rejects.toThrow(AppError);
    });

    it('rolls back the transaction on an unexpected error', async () => {
      const projectData = createProjectData();

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB exploded')); // INSERT fails

      await expect(
        projectService.createProject('user-1', projectData)
      ).rejects.toThrow(AppError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  // ─── getProject ────────────────────────────────────────────────────────────

  describe('getProject', () => {
    it('returns the project when found and user has access', async () => {
      const project = createRandomProject({
        id: 'proj-42',
        settings: '{"theme":"dark"}'
      });
      db.query.mockResolvedValueOnce({ rows: [project] });

      const result = await projectService.getProject('proj-42', 'user-1');

      expect(result).toMatchObject({ id: 'proj-42' });
    });

    it('throws 404 AppError when no matching row is returned', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });
      let caught;
      try {
        await projectService.getProject('non-existent', 'user-1');
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(AppError);
      expect(caught.statusCode).toBe(404);
    });
  });

  // ─── deleteProject ─────────────────────────────────────────────────────────

  describe('deleteProject', () => {
    it('soft-deletes the project and related data when user is owner', async () => {
      const ownerId = 'owner-99';
      const projectId = 'proj-99';

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ owner_id: ownerId }]
        }) // auth SELECT
        .mockResolvedValueOnce({ rows: [] }) // UPDATE projects (soft delete)
        .mockResolvedValueOnce({ rows: [] }) // UPDATE conversations
        .mockResolvedValueOnce({ rows: [] }) // UPDATE sources
        .mockResolvedValueOnce(undefined); // COMMIT

      await projectService.deleteProject(projectId, ownerId);

      // Verify the soft-delete UPDATE was issued for the projects table
      const updateCall = mockClient.query.mock.calls.find(
        ([sql]) =>
          typeof sql === 'string' &&
          sql.includes('UPDATE projects') &&
          sql.includes('deleted_at')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toContain(projectId);

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('throws 403 AppError when a non-owner attempts to delete', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ owner_id: 'real-owner' }] }); // auth SELECT

      let caught;
      try {
        await projectService.deleteProject('proj-99', 'imposter');
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(AppError);
      expect(caught.statusCode).toBe(403);
    });

    it('throws 404 AppError when the project does not exist', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // auth SELECT returns nothing

      await expect(
        projectService.deleteProject('ghost-proj', 'user-x')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('rolls back the transaction on unexpected DB failure', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ owner_id: 'owner-99' }] }) // auth SELECT
        .mockRejectedValueOnce(new Error('Disk full')); // soft-delete UPDATE fails

      await expect(
        projectService.deleteProject('proj-99', 'owner-99')
      ).rejects.toThrow(AppError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  // ─── updateProject ─────────────────────────────────────────────────────────

  describe('updateProject', () => {
    it('updates allowed fields and returns the updated project', async () => {
      const updated = createRandomProject({ id: 'proj-5', name: 'Renamed' });

      db.query
        .mockResolvedValueOnce({
          rows: [{ role: 'owner', owner_id: 'user-5' }]
        }) // auth SELECT
        .mockResolvedValueOnce({ rows: [{ ...updated, settings: '{}' }] }); // UPDATE

      const result = await projectService.updateProject('proj-5', 'user-5', {
        name: 'Renamed'
      });

      expect(result.name).toBe('Renamed');
    });

    it('throws 403 when caller has no owner or editor role', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ role: 'viewer', owner_id: 'other-user' }]
      });

      await expect(
        projectService.updateProject('proj-5', 'viewer-user', { name: 'Hack' })
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
