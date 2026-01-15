/**
 * K6 Load Testing Suite
 * =====================
 * 
 * Comprehensive load testing scenarios for:
 * - API endpoints
 * - Authentication flows
 * - Database operations
 * - Concurrent users
 * - Stress testing
 * - Spike testing
 * - Soak testing
 * 
 * Usage:
 * k6 run load-tests/k6-load-test.js
 * 
 * Thresholds:
 * - 95% of requests < 200ms
 * - 99% of requests < 500ms
 * - Error rate < 1%
 * - Success rate > 99%
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Test configuration
export const options = {
  // Scenarios for different testing patterns
  scenarios: {
    // Smoke test - minimal load
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },

    // Load test - normal traffic
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'load' },
      startTime: '30s', // Start after smoke test
    },

    // Stress test - find breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '5m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      startTime: '16m30s', // Start after load test
    },

    // Spike test - sudden traffic surge
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 500 },   // Spike!
        { duration: '3m', target: 500 },
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 0 },
      ],
      tags: { test_type: 'spike' },
      startTime: '38m30s', // Start after stress test
    },

    // Soak test - sustained load over time
    soak: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30m',
      tags: { test_type: 'soak' },
      startTime: '45m', // Start after spike test
    },
  },

  // Performance thresholds
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% < 200ms, 99% < 500ms
    http_req_failed: ['rate<0.01'],                // Error rate < 1%
    errors: ['rate<0.01'],
    successful_requests: ['count>0'],
  },

  // Test tags
  tags: {
    project: 'zekka-framework',
    environment: 'staging'
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const testUsers = [
  { email: 'test1@example.com', password: 'Test123!@#' },
  { email: 'test2@example.com', password: 'Test123!@#' },
  { email: 'test3@example.com', password: 'Test123!@#' },
];

// Helper function to get random test user
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

// Setup function - runs once before all scenarios
export function setup() {
  console.log('Starting load tests...');
  console.log(`Target: ${BASE_URL}`);
  
  // Health check
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  check(healthCheck, {
    'health check passed': (r) => r.status === 200,
  });

  return { startTime: new Date().toISOString() };
}

// Main test function
export default function (data) {
  // API Health Check
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    
    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 100ms': (r) => r.timings.duration < 100,
    });

    requestDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    
    if (res.status === 200) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }
  });

  sleep(1);

  // User Authentication Flow
  group('Authentication', () => {
    const user = getRandomUser();
    
    // Login
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: user.email,
        password: user.password,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const loginSuccess = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login has token': (r) => JSON.parse(r.body).accessToken !== undefined,
      'login response time < 300ms': (r) => r.timings.duration < 300,
    });

    requestDuration.add(loginRes.timings.duration);
    errorRate.add(!loginSuccess);

    if (loginSuccess) {
      successfulRequests.add(1);
      const token = JSON.parse(loginRes.body).accessToken;

      // Authenticated request
      const authRes = http.get(`${BASE_URL}/api/security/password/policy`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      check(authRes, {
        'auth request status is 200': (r) => r.status === 200,
        'auth response time < 200ms': (r) => r.timings.duration < 200,
      });

      requestDuration.add(authRes.timings.duration);
      errorRate.add(authRes.status !== 200);

      if (authRes.status === 200) {
        successfulRequests.add(1);
      } else {
        failedRequests.add(1);
      }
    } else {
      failedRequests.add(1);
    }
  });

  sleep(1);

  // API Versioning Test
  group('API Versioning', () => {
    // Test v1
    const v1Res = http.get(`${BASE_URL}/api/v1/health`);
    check(v1Res, {
      'v1 status is 200': (r) => r.status === 200,
      'v1 has deprecation warning': (r) => r.headers['X-Api-Deprecated'] !== undefined,
    });

    // Test v2
    const v2Res = http.get(`${BASE_URL}/api/v2/health`);
    check(v2Res, {
      'v2 status is 200': (r) => r.status === 200,
      'v2 is latest': (r) => r.headers['X-Api-Version'] === 'v2',
    });

    requestDuration.add((v1Res.timings.duration + v2Res.timings.duration) / 2);
  });

  sleep(1);

  // Security Endpoints
  group('Security Endpoints', () => {
    const passwordValidateRes = http.post(
      `${BASE_URL}/api/security/password/validate`,
      JSON.stringify({
        password: 'TestPassword123!@#',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    check(passwordValidateRes, {
      'password validation status is 200': (r) => r.status === 200,
      'password validation response time < 100ms': (r) => r.timings.duration < 100,
    });

    requestDuration.add(passwordValidateRes.timings.duration);
  });

  sleep(1);

  // Integration Tests
  group('Integration Health', () => {
    const integrationsRes = http.get(`${BASE_URL}/api/integrations/phase6a/health`);
    
    check(integrationsRes, {
      'integrations health status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    requestDuration.add(integrationsRes.timings.duration);
  });

  sleep(Math.random() * 2); // Random sleep between 0-2 seconds
}

// Teardown function - runs once after all scenarios
export function teardown(data) {
  console.log('Load tests completed');
  console.log(`Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
  
  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Successful requests: ${successfulRequests.value}`);
  console.log(`Failed requests: ${failedRequests.value}`);
  console.log(`Error rate: ${(errorRate.rate * 100).toFixed(2)}%`);
}

// Handle teardown results
export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Text summary helper
function textSummary(data, opts = {}) {
  const indent = opts.indent || '';
  const enableColors = opts.enableColors !== false;
  
  let summary = `\n${indent}Test Summary\n`;
  summary += `${indent}============\n\n`;
  
  // Metrics
  for (const [name, metric] of Object.entries(data.metrics)) {
    if (metric.values) {
      summary += `${indent}${name}:\n`;
      summary += `${indent}  min: ${metric.values.min.toFixed(2)}ms\n`;
      summary += `${indent}  avg: ${metric.values.avg.toFixed(2)}ms\n`;
      summary += `${indent}  max: ${metric.values.max.toFixed(2)}ms\n`;
      summary += `${indent}  p(95): ${metric.values['p(95)'].toFixed(2)}ms\n`;
      summary += `${indent}  p(99): ${metric.values['p(99)'].toFixed(2)}ms\n\n`;
    }
  }
  
  return summary;
}
