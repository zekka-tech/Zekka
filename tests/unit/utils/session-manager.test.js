/**
 * SessionManager Unit Tests
 *
 * Covers: createSession, createRefreshSession, maxConcurrentSessions
 * enforcement, validateSession, invalidateSession, validateRefreshSession,
 * invalidateRefreshSession, invalidateAllUserSessions, and in-memory fallback.
 */

// connect-redis requires a real ioredis/node-redis client to construct; mock
// it so SessionManager can be instantiated with our plain object mocks.
jest.mock('connect-redis', () => {
  function MockRedisStore() {}
  MockRedisStore.prototype.get = jest.fn();
  MockRedisStore.prototype.set = jest.fn();
  MockRedisStore.prototype.destroy = jest.fn((id, cb) => cb && cb());
  return { default: jest.fn(() => MockRedisStore) };
});

// express-session is pulled in transitively; keep it lightweight.
jest.mock('express-session', () => jest.fn(() => (req, res, next) => next()));

const crypto = require('crypto');
const SessionManager = require('../../../src/utils/session-manager');

// ─── Redis mock factory ───────────────────────────────────────────────────────

function makeRedis() {
  // Mutable stores — tests can replace them directly (r.store = new Map(...))
  const r = {
    store: new Map(),   // key → stringified value
    hashes: new Map()   // key → Map(field → value)
  };

  function hget(key) {
    if (!r.hashes.has(key)) r.hashes.set(key, new Map());
    return r.hashes.get(key);
  }

  // Attach mock fns that always dereference r.store / r.hashes at call time
  r.set = jest.fn(async (key, value) => { r.store.set(key, value); return 'OK'; });
  r.get = jest.fn(async (key) => r.store.get(key) ?? null);
  r.del = jest.fn(async (...keys) => {
    keys.flat().forEach((k) => { r.store.delete(k); r.hashes.delete(k); });
    return keys.flat().length;
  });
  r.exists = jest.fn(async (key) => (r.store.has(key) ? 1 : 0));
  r.expire = jest.fn(async () => 1);

  r.hSet = jest.fn(async (key, field, value) => { hget(key).set(field, value); return 1; });
  r.hGetAll = jest.fn(async (key) => Object.fromEntries(hget(key)));
  r.hKeys = jest.fn(async (key) => [...hget(key).keys()]);
  r.hLen = jest.fn(async (key) => hget(key).size);
  r.hDel = jest.fn(async (key, field) => { hget(key).delete(field); return 1; });

  r.lPush = jest.fn(async () => 1);
  r.lTrim = jest.fn(async () => 'OK');
  r.scan = jest.fn(async () => ({ cursor: '0', keys: [] }));

  return r;
}

function makeManager(redisClient, opts = {}) {
  return new SessionManager(redisClient, {
    sessionSecret: 'test-secret-minimum-length',
    maxConcurrentSessions: 3,
    ...opts
  });
}

const UID = 'user-aaa';

// ─── createSession ────────────────────────────────────────────────────────────

describe('SessionManager.createSession', () => {
  it('stores a session record and adds it to the user hash', async () => {
    const redis = makeRedis();
    const mgr = makeManager(redis);

    const id = await mgr.createSession({ userId: UID, token: 'tok-1' });

    expect(typeof id).toBe('string');
    expect(redis.set).toHaveBeenCalledWith(
      `auth:session:${id}`,
      expect.any(String),
      expect.objectContaining({ EX: expect.any(Number) })
    );
    expect(redis.hSet).toHaveBeenCalledWith(
      `auth:user:${UID}:sessions`,
      id,
      'tok-1'
    );
  });

  it('enforces maxConcurrentSessions — evicts oldest when limit exceeded', async () => {
    const redis = makeRedis();
    const mgr = makeManager(redis, { maxConcurrentSessions: 2 });

    // Seed 2 existing sessions that are older than the one we will create
    const old1 = crypto.randomUUID();
    const old2 = crypto.randomUUID();

    redis.store.set(`auth:session:${old1}`,
      JSON.stringify({ userId: UID, token: 'tok-old1', createdAt: 1000, lastActivity: 1000 }));
    redis.store.set(`auth:session:${old2}`,
      JSON.stringify({ userId: UID, token: 'tok-old2', createdAt: 2000, lastActivity: 2000 }));
    redis.hashes.set(`auth:user:${UID}:sessions`,
      new Map([[old1, 'tok-old1'], [old2, 'tok-old2']]));

    // Create a 3rd session — should trigger eviction of old1 (earliest createdAt)
    await mgr.createSession({ userId: UID, token: 'tok-new' });

    // old1 must be deleted from both the data key and the hash
    const deletedKeys = redis.del.mock.calls.flat();
    expect(deletedKeys).toContain(`auth:session:${old1}`);

    const removedHashFields = redis.hDel.mock.calls
      .filter(([key]) => key === `auth:user:${UID}:sessions`)
      .map(([, field]) => field);
    expect(removedHashFields).toContain(old1);
  });

  it('returns a new session id each call', async () => {
    const redis = makeRedis();
    const mgr = makeManager(redis);

    const id1 = await mgr.createSession({ userId: UID, token: 'tok-a' });
    const id2 = await mgr.createSession({ userId: UID, token: 'tok-b' });

    expect(id1).not.toBe(id2);
  });
});

// ─── createRefreshSession ─────────────────────────────────────────────────────

describe('SessionManager.createRefreshSession', () => {
  it('stores a refresh session record and adds it to the user refresh hash', async () => {
    const redis = makeRedis();
    const mgr = makeManager(redis);

    const id = await mgr.createRefreshSession({ userId: UID, refreshToken: 'rt-1' });

    expect(typeof id).toBe('string');
    expect(redis.set).toHaveBeenCalledWith(
      `auth:refresh:${id}`,
      expect.any(String),
      expect.objectContaining({ EX: expect.any(Number) })
    );
    expect(redis.hSet).toHaveBeenCalledWith(
      `auth:user:${UID}:refresh`,
      id,
      'rt-1'
    );
  });

  it('enforces maxConcurrentSessions on refresh tokens — evicts oldest', async () => {
    const redis = makeRedis();
    const mgr = makeManager(redis, { maxConcurrentSessions: 2 });

    const old1 = crypto.randomUUID();
    const old2 = crypto.randomUUID();

    redis.store.set(`auth:refresh:${old1}`,
      JSON.stringify({ userId: UID, refreshToken: 'rt-old1', createdAt: 1000 }));
    redis.store.set(`auth:refresh:${old2}`,
      JSON.stringify({ userId: UID, refreshToken: 'rt-old2', createdAt: 2000 }));
    redis.hashes.set(`auth:user:${UID}:refresh`,
      new Map([[old1, 'rt-old1'], [old2, 'rt-old2']]));

    await mgr.createRefreshSession({ userId: UID, refreshToken: 'rt-new' });

    const deletedKeys = redis.del.mock.calls.flat();
    expect(deletedKeys).toContain(`auth:refresh:${old1}`);

    const removedHashFields = redis.hDel.mock.calls
      .filter(([key]) => key === `auth:user:${UID}:refresh`)
      .map(([, field]) => field);
    expect(removedHashFields).toContain(old1);
  });
});

// ─── validateSession / invalidateSession ──────────────────────────────────────

describe('SessionManager.validateSession', () => {
  it('returns true when the token is in the user hash', async () => {
    const redis = makeRedis();
    const mgr = makeManager(redis);

    await mgr.createSession({ userId: UID, token: 'tok-x' });
    const valid = await mgr.validateSession(UID, 'tok-x');
    expect(valid).toBe(true);
  });

  it('returns false for a token not belonging to the user', async () => {
    const redis = makeRedis();
    const mgr = makeManager(redis);

    await mgr.createSession({ userId: UID, token: 'tok-mine' });
    const valid = await mgr.validateSession(UID, 'tok-other');
    expect(valid).toBe(false);
  });
});

describe('SessionManager.invalidateSession', () => {
  it('removes the session so subsequent validation fails', async () => {
    const redis = makeRedis();
    const mgr = makeManager(redis);

    await mgr.createSession({ userId: UID, token: 'tok-gone' });
    expect(await mgr.validateSession(UID, 'tok-gone')).toBe(true);

    await mgr.invalidateSession(UID, 'tok-gone');
    expect(await mgr.validateSession(UID, 'tok-gone')).toBe(false);
  });
});

// ─── validateRefreshSession / invalidateRefreshSession ────────────────────────

describe('SessionManager.validateRefreshSession', () => {
  it('returns true when the refresh token is present', async () => {
    const redis = makeRedis();
    const mgr = makeManager(redis);

    await mgr.createRefreshSession({ userId: UID, refreshToken: 'rt-x' });
    expect(await mgr.validateRefreshSession(UID, 'rt-x')).toBe(true);
  });

  it('returns false when the refresh token is absent', async () => {
    const redis = makeRedis();
    const mgr = makeManager(redis);

    expect(await mgr.validateRefreshSession(UID, 'rt-not-exist')).toBe(false);
  });
});

describe('SessionManager.invalidateRefreshSession', () => {
  it('removes the refresh session so subsequent validation fails', async () => {
    const redis = makeRedis();
    const mgr = makeManager(redis);

    await mgr.createRefreshSession({ userId: UID, refreshToken: 'rt-gone' });
    expect(await mgr.validateRefreshSession(UID, 'rt-gone')).toBe(true);

    await mgr.invalidateRefreshSession(UID, 'rt-gone');
    expect(await mgr.validateRefreshSession(UID, 'rt-gone')).toBe(false);
  });
});

// ─── invalidateAllUserSessions ────────────────────────────────────────────────

describe('SessionManager.invalidateAllUserSessions', () => {
  it('removes all bearer and refresh sessions for a user', async () => {
    const redis = makeRedis();
    const mgr = makeManager(redis);

    await mgr.createSession({ userId: UID, token: 'tok-1' });
    await mgr.createSession({ userId: UID, token: 'tok-2' });
    await mgr.createRefreshSession({ userId: UID, refreshToken: 'rt-1' });

    await mgr.invalidateAllUserSessions(UID);

    expect(await mgr.validateSession(UID, 'tok-1')).toBe(false);
    expect(await mgr.validateSession(UID, 'tok-2')).toBe(false);
    expect(await mgr.validateRefreshSession(UID, 'rt-1')).toBe(false);
  });

  it('does not affect sessions belonging to a different user', async () => {
    const redis = makeRedis();
    const mgr = makeManager(redis);
    const OTHER = 'user-bbb';

    await mgr.createSession({ userId: UID, token: 'tok-a' });
    await mgr.createSession({ userId: OTHER, token: 'tok-b' });

    await mgr.invalidateAllUserSessions(UID);

    expect(await mgr.validateSession(OTHER, 'tok-b')).toBe(true);
  });
});

// ─── In-memory fallback (no Redis) ───────────────────────────────────────────

describe('SessionManager — in-memory fallback (no Redis client)', () => {
  function makeMemoryManager(opts = {}) {
    return new SessionManager(null, {
      sessionSecret: 'test-secret-minimum-length',
      maxConcurrentSessions: 2,
      ...opts
    });
  }

  it('createSession stores and validates without Redis', async () => {
    const mgr = makeMemoryManager();
    await mgr.createSession({ userId: UID, token: 'mem-tok' });
    expect(await mgr.validateSession(UID, 'mem-tok')).toBe(true);
  });

  it('createRefreshSession stores and validates without Redis', async () => {
    const mgr = makeMemoryManager();
    await mgr.createRefreshSession({ userId: UID, refreshToken: 'mem-rt' });
    expect(await mgr.validateRefreshSession(UID, 'mem-rt')).toBe(true);
  });

  it('enforces maxConcurrentSessions for bearer sessions in memory', async () => {
    const mgr = makeMemoryManager({ maxConcurrentSessions: 2 });

    await mgr.createSession({ userId: UID, token: 'mem-1' });
    await mgr.createSession({ userId: UID, token: 'mem-2' });
    await mgr.createSession({ userId: UID, token: 'mem-3' }); // triggers eviction

    // Only 2 sessions should remain
    const count = await mgr.getActiveSessionCount(UID);
    expect(count).toBeLessThanOrEqual(2);
  });

  it('enforces maxConcurrentSessions for refresh sessions in memory', async () => {
    const mgr = makeMemoryManager({ maxConcurrentSessions: 2 });

    await mgr.createRefreshSession({ userId: UID, refreshToken: 'rt-1' });
    await mgr.createRefreshSession({ userId: UID, refreshToken: 'rt-2' });
    await mgr.createRefreshSession({ userId: UID, refreshToken: 'rt-3' });

    // At most 2 refresh sessions should be valid
    const valid = [
      await mgr.validateRefreshSession(UID, 'rt-1'),
      await mgr.validateRefreshSession(UID, 'rt-2'),
      await mgr.validateRefreshSession(UID, 'rt-3')
    ].filter(Boolean);

    expect(valid.length).toBeLessThanOrEqual(2);
  });

  it('invalidateSession removes the session from memory', async () => {
    const mgr = makeMemoryManager();
    await mgr.createSession({ userId: UID, token: 'mem-del' });
    await mgr.invalidateSession(UID, 'mem-del');
    expect(await mgr.validateSession(UID, 'mem-del')).toBe(false);
  });

  it('invalidateRefreshSession removes the refresh session from memory', async () => {
    const mgr = makeMemoryManager();
    await mgr.createRefreshSession({ userId: UID, refreshToken: 'rt-del' });
    await mgr.invalidateRefreshSession(UID, 'rt-del');
    expect(await mgr.validateRefreshSession(UID, 'rt-del')).toBe(false);
  });
});
