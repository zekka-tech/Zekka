jest.mock('../../../src/utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
}));

const {
  csrfTokenGenerator,
  csrfTokenValidator
} = require('../../../src/middleware/csrf');

describe('csrf middleware', () => {
  const createResponse = () => ({
    locals: {},
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis()
  });

  it('generates a per-session token and exposes it to the response locals', () => {
    const req = {
      sessionID: 'session-generator',
      session: {}
    };
    const res = createResponse();
    const next = jest.fn();

    csrfTokenGenerator(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.session.csrfToken).toEqual(expect.any(String));
    expect(res.locals.csrfToken).toBe(req.session.csrfToken);
    expect(req.session.csrf.token).toBe(req.session.csrfToken);
    expect(req.session.csrf.createdAt).toEqual(expect.any(Number));
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('skips validation for safe methods', () => {
    const req = { method: 'GET' };
    const res = createResponse();
    const next = jest.fn();

    csrfTokenValidator(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects unsafe requests without a token', () => {
    const req = {
      method: 'POST',
      path: '/api/v1/projects',
      ip: '127.0.0.1',
      sessionID: 'session-missing',
      session: {},
      headers: {},
      query: {}
    };
    const res = createResponse();
    const next = jest.fn();

    csrfTokenValidator(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CSRF_TOKEN_MISSING'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid token and keeps the same session-backed token across requests', () => {
    const req = {
      method: 'POST',
      path: '/api/v1/projects',
      ip: '127.0.0.1',
      sessionID: 'session-valid',
      session: {},
      headers: {}
    };
    const res = createResponse();
    const next = jest.fn();

    csrfTokenGenerator(req, res, jest.fn());
    const issuedToken = req.session.csrfToken;

    req.headers['x-csrf-token'] = issuedToken;
    csrfTokenValidator(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.locals.csrfToken).toBe(issuedToken);
    expect(req.session.csrfToken).toBe(issuedToken);
  });

  it('validates the same token on subsequent unsafe requests that share a session store', () => {
    const sharedSession = {};
    const res = createResponse();
    const next = jest.fn();
    const req = {
      method: 'POST',
      path: '/api/v1/projects',
      ip: '127.0.0.1',
      sessionID: 'session-persistent',
      session: sharedSession,
      headers: {},
      query: {}
    };

    csrfTokenGenerator(req, res, jest.fn());
    const issuedToken = sharedSession.csrfToken;

    req.headers['x-csrf-token'] = issuedToken;
    csrfTokenValidator(req, res, next);
    csrfTokenValidator(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(sharedSession.csrfToken).toBe(issuedToken);
  });

  it('allows bearer-authenticated requests to bypass CSRF validation', () => {
    const req = {
      method: 'POST',
      path: '/api/v1/projects',
      headers: {
        authorization: 'Bearer test-token'
      }
    };
    const res = createResponse();
    const next = jest.fn();

    csrfTokenValidator(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
