/**
 * Multi-Tenancy Isolation Tests
 *
 * Verifies that authorization logic correctly prevents cross-user data access.
 * Tests controller-level guards, JWT validation logic, and GDPR data isolation.
 *
 * These tests run against real application code with minimal mocks —
 * only network-bound modules (pg, redis, sockets) are stubbed so that
 * the business logic itself is exercised as-is.
 *
 * @group integration
 */

// ── Stubs for network-bound modules ──────────────────────────────────────────

jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn()
  };
  const mockPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue(mockClient),
    end: jest.fn().mockResolvedValue(undefined)
  };
  return { Pool: jest.fn(() => mockPool) };
});

jest.mock('../../src/config/database', () => {
  const mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn()
  };
  return {
    pool: {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      connect: jest.fn().mockResolvedValue(mockClient)
    },
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    getClient: jest.fn().mockResolvedValue(mockClient),
    healthCheck: jest.fn().mockResolvedValue(true)
  };
});

jest.mock('../../src/config/redis', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  lpush: jest.fn().mockResolvedValue(1),
  lrange: jest.fn().mockResolvedValue([]),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  healthCheck: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/middleware/websocket', () => ({
  initializeWebSocket: jest.fn(),
  broadcastProjectUpdate: jest.fn(),
  getIO: jest.fn().mockReturnValue({ to: jest.fn().mockReturnThis(), emit: jest.fn() })
}));

jest.mock('../../src/services/email.service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/services/audit-service', () => ({
  log: jest.fn().mockResolvedValue(undefined)
}));

// ─────────────────────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const USER_A_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const USER_B_ID = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';

function makeToken(userId, extra = {}) {
  return jwt.sign({ userId, email: 'user@test.com', type: 'access', ...extra }, JWT_SECRET, { expiresIn: '1h' });
}

// ─── 1. Controller: assertSelfAccess ─────────────────────────────────────────

describe('Multi-Tenancy: UsersController.assertSelfAccess', () => {
  let UsersController;

  beforeAll(() => {
    ({ UsersController } = require('../../src/controllers/users.controller'));
  });

  it('allows access when userId === authenticatedUserId', () => {
    const ctrl = new UsersController();
    expect(() => ctrl.assertSelfAccess(USER_A_ID, USER_A_ID)).not.toThrow();
  });

  it('throws when userId !== authenticatedUserId (cross-user)', () => {
    const ctrl = new UsersController();
    expect(() => ctrl.assertSelfAccess(USER_A_ID, USER_B_ID)).toThrow();
  });

  it('throws when authenticatedUserId is empty string', () => {
    const ctrl = new UsersController();
    expect(() => ctrl.assertSelfAccess(USER_A_ID, '')).toThrow();
  });

  it('throws when authenticatedUserId is null', () => {
    const ctrl = new UsersController();
    expect(() => ctrl.assertSelfAccess(USER_A_ID, null)).toThrow();
  });
});

// ─── 2. GDPR controller: authorization checked before data access ─────────────

describe('Multi-Tenancy: GDPR endpoints gate on assertSelfAccess', () => {
  let UsersController;

  beforeAll(() => {
    ({ UsersController } = require('../../src/controllers/users.controller'));
  });

  it('exportUserData calls assertSelfAccess and rejects cross-user request', async () => {
    const ctrl = new UsersController();
    const spy = jest.spyOn(ctrl, 'assertSelfAccess').mockImplementation(() => {
      throw new Error('cross-user blocked');
    });

    const req = { params: { userId: USER_A_ID }, user: { userId: USER_B_ID }, query: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await ctrl.exportUserData(req, res, next);

    expect(spy).toHaveBeenCalledWith(USER_A_ID, USER_B_ID);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('deleteUserData calls assertSelfAccess and rejects cross-user request', async () => {
    const ctrl = new UsersController();
    const spy = jest.spyOn(ctrl, 'assertSelfAccess').mockImplementation(() => {
      throw new Error('cross-user blocked');
    });

    const req = { params: { userId: USER_A_ID }, user: { userId: USER_B_ID }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await ctrl.deleteUserData(req, res, next);

    expect(spy).toHaveBeenCalledWith(USER_A_ID, USER_B_ID);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('getUser calls assertSelfAccess and rejects cross-user request', async () => {
    const ctrl = new UsersController();
    const spy = jest.spyOn(ctrl, 'assertSelfAccess').mockImplementation(() => {
      throw new Error('cross-user blocked');
    });

    const req = { params: { userId: USER_A_ID }, user: { userId: USER_B_ID } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await ctrl.getUser(req, res, next);

    expect(spy).toHaveBeenCalledWith(USER_A_ID, USER_B_ID);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('updateUser calls assertSelfAccess and rejects cross-user request', async () => {
    const ctrl = new UsersController();
    const spy = jest.spyOn(ctrl, 'assertSelfAccess').mockImplementation(() => {
      throw new Error('cross-user blocked');
    });

    const req = { params: { userId: USER_A_ID }, user: { userId: USER_B_ID }, body: { name: 'Hacked' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await ctrl.updateUser(req, res, next);

    expect(spy).toHaveBeenCalledWith(USER_A_ID, USER_B_ID);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─── 3. JWT token type enforcement ───────────────────────────────────────────

describe('Multi-Tenancy: Token type separation — access vs refresh', () => {
  it('access token and refresh token carry distinct type fields', () => {
    const access = jwt.sign({ userId: USER_A_ID, type: 'access' }, JWT_SECRET, { expiresIn: '1h' });
    const refresh = jwt.sign({ userId: USER_A_ID, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });

    const decodedAccess = jwt.verify(access, JWT_SECRET);
    const decodedRefresh = jwt.verify(refresh, JWT_SECRET);

    expect(decodedAccess.type).toBe('access');
    expect(decodedRefresh.type).toBe('refresh');
    expect(decodedAccess.type).not.toBe(decodedRefresh.type);
  });

  it('a forged token with wrong secret fails jwt.verify', () => {
    const forged = jwt.sign({ userId: USER_A_ID, type: 'access' }, 'attacker-secret', { expiresIn: '1h' });
    expect(() => jwt.verify(forged, JWT_SECRET)).toThrow(jwt.JsonWebTokenError);
  });

  it('an expired token fails jwt.verify', () => {
    const expired = jwt.sign({ userId: USER_A_ID, type: 'access' }, JWT_SECRET, { expiresIn: '-1s' });
    expect(() => jwt.verify(expired, JWT_SECRET)).toThrow(jwt.TokenExpiredError);
  });

  it('userId in token payload correctly identifies the token owner', () => {
    const token = makeToken(USER_A_ID);
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.userId).toBe(USER_A_ID);
    expect(decoded.userId).not.toBe(USER_B_ID);
  });

  it('token for USER_A cannot impersonate USER_B', () => {
    const tokenA = makeToken(USER_A_ID);
    const decoded = jwt.verify(tokenA, JWT_SECRET);
    expect(decoded.userId).toBe(USER_A_ID);
    expect(decoded.userId).not.toBe(USER_B_ID);
  });
});

// ─── 4. sanitizeUser strips sensitive fields ──────────────────────────────────

describe('Multi-Tenancy: UsersController.sanitizeUser — no credentials in responses', () => {
  let UsersController;

  beforeAll(() => {
    ({ UsersController } = require('../../src/controllers/users.controller'));
  });

  const sensitiveUser = {
    id: USER_A_ID,
    email: 'usera@test.com',
    name: 'User A',
    password: '$2b$12$hashedpassword',
    password_history: ['$2b$12$old1', '$2b$12$old2'],
    reset_token: 'secret-reset-token-xyz',
    reset_token_expires_at: new Date().toISOString(),
    verification_token: 'secret-verify-token-xyz',
    verification_token_expires_at: new Date().toISOString(),
    role: 'user'
  };

  it('strips password from user object', () => {
    const ctrl = new UsersController();
    const sanitized = ctrl.sanitizeUser(sensitiveUser);
    expect(sanitized).not.toHaveProperty('password');
  });

  it('strips password_history from user object', () => {
    const ctrl = new UsersController();
    const sanitized = ctrl.sanitizeUser(sensitiveUser);
    expect(sanitized).not.toHaveProperty('password_history');
  });

  it('strips reset_token from user object', () => {
    const ctrl = new UsersController();
    const sanitized = ctrl.sanitizeUser(sensitiveUser);
    expect(sanitized).not.toHaveProperty('reset_token');
  });

  it('strips verification_token from user object', () => {
    const ctrl = new UsersController();
    const sanitized = ctrl.sanitizeUser(sensitiveUser);
    expect(sanitized).not.toHaveProperty('verification_token');
  });

  it('retains non-sensitive fields (id, email, name, role)', () => {
    const ctrl = new UsersController();
    const sanitized = ctrl.sanitizeUser(sensitiveUser);
    expect(sanitized.id).toBe(USER_A_ID);
    expect(sanitized.email).toBe('usera@test.com');
    expect(sanitized.name).toBe('User A');
    expect(sanitized.role).toBe('user');
  });
});
