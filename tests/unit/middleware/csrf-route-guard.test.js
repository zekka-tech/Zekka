const {
  shouldSkipCsrfValidation,
  createCsrfRouteGuard
} = require('../../../src/middleware/csrf-route-guard');

// Helper: build a minimal req with a session cookie so CSRF enforcement kicks in.
const withSession = (req) => ({
  ...req,
  headers: { cookie: 'zekka.sid=abc123' }
});

describe('csrf-route-guard', () => {
  it('skips safe methods automatically', () => {
    expect(shouldSkipCsrfValidation(withSession({ method: 'GET', path: '/projects' }))).toBe(true);
    expect(shouldSkipCsrfValidation(withSession({ method: 'OPTIONS', path: '/agents' }))).toBe(true);
  });

  it('skips public auth bootstrap routes', () => {
    expect(shouldSkipCsrfValidation(withSession({ method: 'POST', path: '/auth/login' }))).toBe(true);
    expect(shouldSkipCsrfValidation(withSession({ method: 'POST', path: '/auth/register' }))).toBe(true);
    expect(shouldSkipCsrfValidation(withSession({ method: 'POST', path: '/auth/forgot-password' }))).toBe(true);
    expect(shouldSkipCsrfValidation(withSession({ method: 'GET', path: '/csrf-token' }))).toBe(true);
  });

  it('skips requests that use Bearer token auth (not CSRF-vulnerable)', () => {
    const req = {
      method: 'POST',
      path: '/projects',
      headers: { authorization: 'Bearer some.jwt.token', cookie: 'zekka.sid=abc123' }
    };
    expect(shouldSkipCsrfValidation(req)).toBe(true);
  });

  it('skips requests with no session cookie (unauthenticated — auth middleware handles them)', () => {
    expect(shouldSkipCsrfValidation({ method: 'POST', path: '/projects', headers: {} })).toBe(true);
    expect(shouldSkipCsrfValidation({ method: 'POST', path: '/projects' })).toBe(true);
  });

  it('enforces CSRF validation on cookie-authenticated state-changing requests', () => {
    expect(shouldSkipCsrfValidation(withSession({ method: 'POST', path: '/projects' }))).toBe(false);
    expect(shouldSkipCsrfValidation(withSession({ method: 'DELETE', path: '/v1/sources/source-1' }))).toBe(false);
  });

  it('delegates to the validator when enforcement is required', () => {
    const next = jest.fn();
    const validator = jest.fn((req, res, validatorNext) => validatorNext());
    const middleware = createCsrfRouteGuard(validator);

    middleware(withSession({ method: 'POST', path: '/projects' }), {}, next);

    expect(validator).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
