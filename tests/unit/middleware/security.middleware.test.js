jest.mock('../../../src/config/database', () => ({
  query: jest.fn()
}));

jest.mock('../../../src/config/redis', () => ({}));
jest.mock('../../../src/services/audit-service', () => ({
  log: jest.fn()
}));
jest.mock('../../../src/services/password-service', () => ({
  checkPasswordExpiration: jest.fn()
}));

const { securityHeaders } = require('../../../src/middleware/security.middleware');

describe('securityHeaders middleware', () => {
  it('sets a nonce-based CSP without unsafe-inline for scripts', () => {
    const req = { secure: true };
    const res = {
      locals: {},
      setHeader: jest.fn()
    };
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(res.locals.cspNonce).toEqual(expect.any(String));
    const cspHeaderCall = res.setHeader.mock.calls.find(
      ([header]) => header === 'Content-Security-Policy'
    );

    expect(cspHeaderCall).toBeDefined();
    expect(cspHeaderCall[1]).toContain(`script-src 'self' 'nonce-${res.locals.cspNonce}'`);
    expect(cspHeaderCall[1]).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(res.setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
    expect(next).toHaveBeenCalled();
  });

  it('does not emit HSTS when the request is not secure', () => {
    const req = { secure: false };
    const res = {
      locals: {},
      setHeader: jest.fn()
    };
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(
      res.setHeader.mock.calls.some(([header]) => header === 'Strict-Transport-Security')
    ).toBe(false);
    expect(next).toHaveBeenCalled();
  });
});
