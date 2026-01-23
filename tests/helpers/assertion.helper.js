/**
 * Assertion Test Helper
 * Custom assertions and validation helpers for tests
 */

/**
 * Assert object has required properties
 */
function assertHasProperties(obj, properties) {
  properties.forEach(prop => {
    expect(obj).toHaveProperty(prop);
  });
}

/**
 * Assert object matches schema
 */
function assertMatchesSchema(obj, schema) {
  Object.entries(schema).forEach(([key, type]) => {
    expect(obj).toHaveProperty(key);
    expect(typeof obj[key]).toBe(type);
  });
}

/**
 * Assert valid UUID
 */
function assertValidUUID(value) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  expect(value).toMatch(uuidRegex);
}

/**
 * Assert valid email
 */
function assertValidEmail(value) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  expect(value).toMatch(emailRegex);
}

/**
 * Assert valid JWT
 */
function assertValidJWT(value) {
  const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  expect(value).toMatch(jwtRegex);
}

/**
 * Assert valid ISO date string
 */
function assertValidISODate(value) {
  expect(value).toBeTruthy();
  expect(new Date(value).toISOString()).toBe(value);
}

/**
 * Assert date is recent (within last N seconds)
 */
function assertRecentDate(value, secondsAgo = 60) {
  const date = new Date(value);
  const now = new Date();
  const diff = (now - date) / 1000;
  expect(diff).toBeLessThan(secondsAgo);
  expect(diff).toBeGreaterThanOrEqual(0);
}

/**
 * Assert array length
 */
function assertArrayLength(arr, length) {
  expect(Array.isArray(arr)).toBe(true);
  expect(arr).toHaveLength(length);
}

/**
 * Assert array contains item matching
 */
function assertArrayContains(arr, matcher) {
  expect(Array.isArray(arr)).toBe(true);
  const found = arr.some(item =>
    Object.entries(matcher).every(([key, value]) => item[key] === value)
  );
  expect(found).toBe(true);
}

/**
 * Assert pagination response
 */
function assertPaginationResponse(response, expectedPage, expectedLimit) {
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('pagination');
  expect(response.pagination).toHaveProperty('page', expectedPage);
  expect(response.pagination).toHaveProperty('limit', expectedLimit);
  expect(response.pagination).toHaveProperty('total');
  expect(response.pagination).toHaveProperty('totalPages');
  expect(Array.isArray(response.data)).toBe(true);
}

/**
 * Assert error object structure
 */
function assertErrorObject(error, expectedMessage = null, expectedCode = null) {
  expect(error).toHaveProperty('error');
  if (expectedMessage) {
    expect(error.error).toContain(expectedMessage);
  }
  if (expectedCode) {
    expect(error).toHaveProperty('code', expectedCode);
  }
}

/**
 * Assert timestamp order
 */
function assertTimestampOrder(items, field = 'created_at', order = 'desc') {
  for (let i = 1; i < items.length; i++) {
    const prev = new Date(items[i - 1][field]);
    const current = new Date(items[i][field]);

    if (order === 'desc') {
      expect(prev >= current).toBe(true);
    } else {
      expect(prev <= current).toBe(true);
    }
  }
}

/**
 * Assert numeric range
 */
function assertInRange(value, min, max) {
  expect(typeof value).toBe('number');
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

/**
 * Assert object is subset of another
 */
function assertIsSubset(subset, superset) {
  Object.entries(subset).forEach(([key, value]) => {
    expect(superset).toHaveProperty(key, value);
  });
}

/**
 * Assert array is sorted
 */
function assertArraySorted(arr, key = null, order = 'asc') {
  for (let i = 1; i < arr.length; i++) {
    const prev = key ? arr[i - 1][key] : arr[i - 1];
    const current = key ? arr[i][key] : arr[i];

    if (order === 'asc') {
      expect(prev <= current).toBe(true);
    } else {
      expect(prev >= current).toBe(true);
    }
  }
}

/**
 * Assert no sensitive data in response
 */
function assertNoSensitiveData(obj) {
  const sensitiveFields = ['password', 'password_hash', 'secret', 'token', 'api_key'];

  const checkObject = (o) => {
    Object.keys(o).forEach(key => {
      expect(sensitiveFields.some(field => key.toLowerCase().includes(field))).toBe(false);

      if (typeof o[key] === 'object' && o[key] !== null) {
        checkObject(o[key]);
      }
    });
  };

  checkObject(obj);
}

/**
 * Assert cost calculation
 */
function assertCostCalculation(tokens, model, expectedCost) {
  const { input_tokens, output_tokens } = tokens;
  expect(typeof input_tokens).toBe('number');
  expect(typeof output_tokens).toBe('number');
  expect(expectedCost).toBeGreaterThan(0);
}

/**
 * Assert analytics metrics
 */
function assertAnalyticsMetrics(metrics) {
  expect(metrics).toHaveProperty('totalTokens');
  expect(metrics).toHaveProperty('totalCost');
  expect(metrics).toHaveProperty('requestCount');
  expect(typeof metrics.totalTokens).toBe('number');
  expect(typeof metrics.totalCost).toBe('number');
  expect(typeof metrics.requestCount).toBe('number');
}

/**
 * Assert rate limit headers
 */
function assertRateLimitHeaders(headers) {
  expect(headers).toHaveProperty('x-ratelimit-limit');
  expect(headers).toHaveProperty('x-ratelimit-remaining');
  expect(headers).toHaveProperty('x-ratelimit-reset');
}

module.exports = {
  assertHasProperties,
  assertMatchesSchema,
  assertValidUUID,
  assertValidEmail,
  assertValidJWT,
  assertValidISODate,
  assertRecentDate,
  assertArrayLength,
  assertArrayContains,
  assertPaginationResponse,
  assertErrorObject,
  assertTimestampOrder,
  assertInRange,
  assertIsSubset,
  assertArraySorted,
  assertNoSensitiveData,
  assertCostCalculation,
  assertAnalyticsMetrics,
  assertRateLimitHeaders
};
