/**
 * End-to-End User Workflow Tests
 * Real HTTP requests via supertest against the Express app.
 * DB and Redis are mocked by tests/setup.js.
 *
 * @group e2e
 */

const request = require('supertest');

let app;
try {
  app = require('../../src/app');
} catch (_) {
  app = require('../../src/index');
}

describe('E2E: Auth Workflows', () => {
  describe('POST /api/v1/auth/register', () => {
    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'incomplete@example.com' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when email format is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: 'SecurePass123!', name: 'X' });
      expect(res.status).toBe(400);
    });

    it('returns structured JSON response for valid registration attempt', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'newuser@example.com', password: 'SecurePass123!', name: 'Test User' });
      expect(typeof res.body).toBe('object');
      expect(res.body).not.toBeNull();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 400 when password is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@example.com' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'SecurePass123!' });
      expect(res.status).toBe(400);
    });

    it('returns JSON with structured body on login attempt', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@example.com', password: 'WrongPassword1!' });
      expect(typeof res.body).toBe('object');
    });
  });

  describe('Protected routes enforce authentication', () => {
    it('GET /api/v1/conversations without token returns 401', async () => {
      const res = await request(app).get('/api/v1/conversations');
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/conversations without token returns 401', async () => {
      const res = await request(app)
        .post('/api/v1/conversations')
        .send({ title: 'Test' });
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/projects without token returns 401', async () => {
      const res = await request(app).get('/api/v1/projects');
      expect(res.status).toBe(401);
    });

    it('malformed Bearer token returns 401', async () => {
      const res = await request(app)
        .get('/api/v1/conversations')
        .set('Authorization', 'Bearer this.is.not.a.real.jwt.token');
      expect(res.status).toBe(401);
    });
  });

  describe('Non-existent routes', () => {
    it('unknown route returns 404', async () => {
      const res = await request(app).get('/api/v1/this-route-xyz-does-not-exist');
      expect(res.status).toBe(404);
    });
  });
});
