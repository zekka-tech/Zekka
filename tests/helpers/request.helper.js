/**
 * Request Test Helper
 * Utilities for creating mock requests and API testing
 */

const request = require('supertest');
const { generateAuthHeader } = require('./auth.helper');

/**
 * Create Express app wrapper for testing
 */
function createTestApp(app) {
  return {
    get: (url) => request(app).get(url),
    post: (url) => request(app).post(url),
    put: (url) => request(app).put(url),
    patch: (url) => request(app).patch(url),
    delete: (url) => request(app).delete(url)
  };
}

/**
 * Make authenticated request
 */
function makeAuthRequest(app, method, url, token = null) {
  const headers = generateAuthHeader(token);
  return request(app)[method.toLowerCase()](url).set(headers);
}

/**
 * Create mock request object
 */
function createMockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    user: null,
    ip: '127.0.0.1',
    method: 'GET',
    url: '/test',
    protocol: 'http',
    get: jest.fn((header) => {
      return overrides.headers?.[header.toLowerCase()];
    }),
    ...overrides
  };
}

/**
 * Create mock response object
 */
function createMockResponse() {
  const res = {
    statusCode: 200,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis()
  };

  // Make status update statusCode
  res.status.mockImplementation((code) => {
    res.statusCode = code;
    return res;
  });

  return res;
}

/**
 * Create mock next function
 */
function createMockNext() {
  return jest.fn();
}

/**
 * Wait for response
 */
async function waitForResponse(promise, timeout = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}

/**
 * Assert response status
 */
function assertStatus(response, expectedStatus) {
  expect(response.status).toBe(expectedStatus);
}

/**
 * Assert response body contains
 */
function assertBodyContains(response, expected) {
  const body = response.body;
  Object.keys(expected).forEach(key => {
    expect(body).toHaveProperty(key);
    if (expected[key] !== undefined) {
      expect(body[key]).toEqual(expected[key]);
    }
  });
}

/**
 * Assert error response
 */
function assertErrorResponse(response, status, message = null) {
  expect(response.status).toBe(status);
  expect(response.body).toHaveProperty('error');
  if (message) {
    expect(response.body.error).toContain(message);
  }
}

/**
 * Assert success response
 */
function assertSuccessResponse(response, status = 200) {
  expect(response.status).toBe(status);
  expect(response.body).toBeDefined();
}

/**
 * Create pagination query
 */
function createPaginationQuery(page = 1, limit = 10, sort = 'created_at', order = 'desc') {
  return {
    page: page.toString(),
    limit: limit.toString(),
    sort,
    order
  };
}

/**
 * Create filter query
 */
function createFilterQuery(filters = {}) {
  return Object.entries(filters).reduce((acc, [key, value]) => {
    acc[key] = Array.isArray(value) ? value.join(',') : value.toString();
    return acc;
  }, {});
}

/**
 * Mock multipart form data
 */
function createMultipartData(fields = {}, files = []) {
  return {
    fields,
    files
  };
}

/**
 * Simulate file upload
 */
function createMockFile(filename = 'test.txt', mimetype = 'text/plain', size = 1024) {
  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype,
    size,
    buffer: Buffer.from('test content'),
    path: `/tmp/${filename}`
  };
}

/**
 * Test middleware chain
 */
async function testMiddlewareChain(middlewares, req, res) {
  const next = createMockNext();

  for (const middleware of middlewares) {
    await middleware(req, res, next);
    if (!next.mock.calls.length) break;
  }

  return { req, res, next };
}

/**
 * Extract cookies from response
 */
function extractCookies(response) {
  const cookies = {};
  const setCookie = response.headers['set-cookie'];

  if (!setCookie) return cookies;

  const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie];

  cookieArray.forEach(cookie => {
    const [nameValue] = cookie.split(';');
    const [name, value] = nameValue.split('=');
    cookies[name.trim()] = value.trim();
  });

  return cookies;
}

module.exports = {
  createTestApp,
  makeAuthRequest,
  createMockRequest,
  createMockResponse,
  createMockNext,
  waitForResponse,
  assertStatus,
  assertBodyContains,
  assertErrorResponse,
  assertSuccessResponse,
  createPaginationQuery,
  createFilterQuery,
  createMultipartData,
  createMockFile,
  testMiddlewareChain,
  extractCookies
};
