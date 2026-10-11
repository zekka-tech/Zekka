/**
 * Source Service tests — realigned to the real `sources` schema.
 * Covers project access control, CRUD, search, stats, and tenant scoping.
 */
jest.mock('../../../src/config/database', () => ({ pool: { query: jest.fn() } }));
jest.mock('../../../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const { pool } = require('../../../src/config/database');
const { SourceService } = require('../../../src/services/source.service');

const USER = 'user_1';
const PROJECT = 'proj_1';
const TENANT = 'a1b2c3d4-0000-0000-0000-000000000055';

let svc;
beforeEach(() => {
  jest.clearAllMocks();
  svc = new SourceService();
});

describe('access control', () => {
  it('throws 404 when the user cannot access the project', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // no accessible project
    await expect(svc.listSources(PROJECT, USER)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('adds the tenant filter to the access check when tenant-scoped', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: PROJECT }] });
    await svc.assertProjectAccess(PROJECT, USER, TENANT);
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toContain('p.tenant_id = $3');
    expect(pool.query.mock.calls[0][1]).toEqual([PROJECT, USER, TENANT]);
  });
});

describe('listSources', () => {
  it('returns sources + pagination after an access check', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: PROJECT }] })   // access
      .mockResolvedValueOnce({ rows: [{ total: 2 }] })       // count
      .mockResolvedValueOnce({ rows: [{ id: 's1' }, { id: 's2' }] }); // page
    const result = await svc.listSources(PROJECT, USER, { limit: 10 });
    expect(result.sources).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });
});

describe('createSource', () => {
  it('inserts a url source with a generated id', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: PROJECT }] }) // access
      .mockResolvedValueOnce({ rows: [{ id: 's1', type: 'url' }] }); // insert
    const src = await svc.createSource(USER, {
      projectId: PROJECT, name: 'Docs', type: 'url', url: 'https://example.com'
    });
    expect(src.type).toBe('url');
    const insert = pool.query.mock.calls[1];
    expect(insert[0]).toContain('INSERT INTO sources');
    expect(insert[1][1]).toBe(PROJECT);
    expect(insert[1][2]).toBe(USER);
  });

  it('stores an uploaded file\'s text in content', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: PROJECT }] })
      .mockResolvedValueOnce({ rows: [{ id: 's2' }] });
    await svc.createSource(USER, {
      projectId: PROJECT,
      file: { originalname: 'n.txt', mimetype: 'text/plain', size: 3, buffer: Buffer.from('abc') }
    });
    const insertParams = pool.query.mock.calls[1][1];
    expect(insertParams[6]).toBe('abc'); // content column
  });

  it('rejects when projectId is missing', async () => {
    await expect(svc.createSource(USER, {})).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('getSource / deleteSource', () => {
  it('getSource joins ownership and 404s when not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await expect(svc.getSource('s9', USER)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deleteSource authorizes then soft-deletes', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 's1', metadata: {} }] }) // getSource
      .mockResolvedValueOnce({ rowCount: 1 }); // update deleted_at
    const ok = await svc.deleteSource('s1', USER);
    expect(ok).toBe(true);
    expect(pool.query.mock.calls[1][0]).toContain('SET deleted_at = NOW()');
  });
});

describe('getSourceStats', () => {
  it('aggregates counts by type', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: PROJECT }] }) // access
      .mockResolvedValueOnce({ rows: [{ type: 'url', count: 2 }, { type: 'text', count: 1 }] });
    const stats = await svc.getSourceStats(PROJECT, USER);
    expect(stats.total).toBe(3);
    expect(stats.byType).toEqual({ url: 2, text: 1 });
  });
});
