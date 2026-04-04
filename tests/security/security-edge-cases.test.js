/**
 * Security Edge Case Tests
 * Real HTTP-level security assertions via supertest.
 * Verifies auth enforcement, input validation, and header protections
 * in the actual Express request pipeline.
 *
 * @group security
 */

const request = require('supertest');

let app;
try {
  app = require('../../src/app');
} catch (_) {
  app = require('../../src/index');
}

describe('Security: Authentication Enforcement', () => {
  it('missing Authorization header on protected endpoint returns 401', async () => {
    const res = await request(app).get('/api/v1/conversations');
    expect(res.status).toBe(401);
  });

  it('malformed JWT returns 401 not 500', async () => {
    const res = await request(app)
      .get('/api/v1/conversations')
      .set('Authorization', 'Bearer definitely.not.a.jwt');
    expect(res.status).toBe(401);
    expect(res.status).not.toBe(500);
  });

  it('Authorization header without Bearer prefix returns 401', async () => {
    const res = await request(app)
      .get('/api/v1/conversations')
      .set('Authorization', 'Token some-api-key');
    expect(res.status).toBe(401);
  });

  it('expired-looking JWT returns 401', async () => {
    // A structurally-valid JWT that will fail signature verification
    const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1LTEiLCJpYXQiOjE2MDAwMDAwMDB9.FAKE_SIGNATURE';
    const res = await request(app)
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${fakeJwt}`);
    expect(res.status).toBe(401);
  });
});

describe('Security: Input Validation', () => {
  it('SQL injection in email field returns 400 not 500', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: "admin' OR '1'='1; --", password: 'anything' });
    expect(res.status).toBe(400);
    expect(res.status).not.toBe(500);
  });

  it('null byte injection in email is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user\x00@example.com', password: 'Test123!' });
    expect([400, 422]).toContain(res.status);
  });

  it('extremely long input is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'a'.repeat(500) + '@x.com', password: 'Test123!' });
    expect([400, 422]).toContain(res.status);
  });

  it('missing password returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com' });
    expect(res.status).toBe(400);
  });
});

describe('Security: Registration Validation', () => {
  it('weak password is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: '123', name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('invalid email format is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'SecurePass123!', name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('XSS payload in name field does not cause 500', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'xss@example.com', password: 'SecurePass123!', name: '<script>alert(1)</script>' });
    expect(res.status).not.toBe(500);
    if (res.status === 201 && res.body.data) {
      expect(res.body.data.name || '').not.toContain('<script>');
    }
  });
});

describe('Security: Response Headers', () => {
  it('API error responses return JSON content-type', async () => {
    const res = await request(app).get('/api/v1/conversations');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('401 response does not leak internal details in production mode', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await request(app).get('/api/v1/conversations');
      expect(res.status).toBe(401);
      // Stack trace must not appear in body
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toMatch(/at\s+\w+\s+\(.*\.js:\d+/);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });
});
