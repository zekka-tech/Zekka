const {
  shouldSkipCsrfValidation,
  createCsrfRouteGuard
} = require('../../../src/middleware/csrf-route-guard');

describe('csrf-route-guard', () => {
  it('skips safe methods automatically', () => {
    expect(shouldSkipCsrfValidation({ method: 'GET', path: '/projects' })).toBe(true);
    expect(shouldSkipCsrfValidation({ method: 'OPTIONS', path: '/agents' })).toBe(true);
  });

  it('skips public auth bootstrap routes', () => {
    expect(shouldSkipCsrfValidation({ method: 'POST', path: '/auth/login' })).toBe(true);
    expect(shouldSkipCsrfValidation({ method: 'POST', path: '/auth/register' })).toBe(true);
    expect(shouldSkipCsrfValidation({ method: 'POST', path: '/auth/forgot-password' })).toBe(true);
    expect(shouldSkipCsrfValidation({ method: 'GET', path: '/csrf-token' })).toBe(true);
  });

  it('enforces CSRF validation on other state-changing API routes', () => {
    expect(shouldSkipCsrfValidation({ method: 'POST', path: '/projects' })).toBe(false);
    expect(shouldSkipCsrfValidation({ method: 'DELETE', path: '/v1/sources/source-1' })).toBe(false);
  });

  it('delegates to the validator when enforcement is required', () => {
    const next = jest.fn();
    const validator = jest.fn((req, res, validatorNext) => validatorNext());
    const middleware = createCsrfRouteGuard(validator);

    middleware({ method: 'POST', path: '/projects' }, {}, next);

    expect(validator).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
