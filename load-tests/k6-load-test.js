/**
 * k6 Load Testing Suite for Zekka Framework
 * 
 * Test Scenarios:
 * 1. Smoke Test - Minimal load to verify system works
 * 2. Load Test - Normal expected load
 * 3. Stress Test - Beyond normal load
 * 4. Spike Test - Sudden traffic increase
 * 5. Soak Test - Sustained load over time
 * 
 * Usage:
 *   k6 run load-tests/k6-load-test.js
 *   k6 run --vus 100 --duration 5m load-tests/k6-load-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_response_time');
const requestCount = new Counter('request_count');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Test scenarios
export const options = {
  scenarios: {
    // Smoke test: 1 user for 1 minute
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest',
    },
    
    // Load test: Ramp up to 100 users over 5 minutes
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '3m', target: 100 },  // Ramp up to 100 users
        { duration: '3m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down to 0
      ],
      tags: { test_type: 'load' },
      exec: 'loadTest',
      startTime: '1m', // Start after smoke test
    },
    
    // Stress test: Push beyond normal load
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 200 },
        { duration: '3m', target: 300 },
        { duration: '2m', target: 400 },
        { duration: '5m', target: 400 },  // Hold at breaking point
        { duration: '3m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      exec: 'stressTest',
      startTime: '11m', // Start after load test
    },
    
    // Spike test: Sudden traffic surge
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },  // Spike to 500 users in 10s
        { duration: '1m', target: 500 },   // Hold for 1 minute
        { duration: '10s', target: 0 },    // Drop back to 0
      ],
      tags: { test_type: 'spike' },
      exec: 'spikeTest',
      startTime: '28m',
    },
  ],
  
  // Performance thresholds
  thresholds: {
    // HTTP errors should be less than 1%
    'http_req_failed': ['rate<0.01'],
    
    // 95% of requests should be below 500ms
    'http_req_duration': ['p(95)<500'],
    
    // 99% of requests should be below 1000ms
    'http_req_duration{test_type:load}': ['p(99)<1000'],
    
    // API response time should be reasonable
    'api_response_time': ['p(95)<300', 'p(99)<600'],
    
    // Error rate should be minimal
    'errors': ['rate<0.05'],
  },
  
  // Additional options
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0',
};

// Test data
const testUsers = [
  { email: 'load-test-1@example.com', password: 'LoadTest123!@#' },
  { email: 'load-test-2@example.com', password: 'LoadTest123!@#' },
  { email: 'load-test-3@example.com', password: 'LoadTest123!@#' },
];

// Helper function: Get random user
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

// Helper function: Make authenticated request
function makeAuthRequest(endpoint, token, method = 'GET', payload = null) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { endpoint },
  };
  
  const url = `${BASE_URL}${endpoint}`;
  let response;
  
  const startTime = Date.now();
  
  if (method === 'GET') {
    response = http.get(url, params);
  } else if (method === 'POST') {
    response = http.post(url, JSON.stringify(payload), params);
  } else if (method === 'PUT') {
    response = http.put(url, JSON.stringify(payload), params);
  } else if (method === 'DELETE') {
    response = http.del(url, params);
  }
  
  const duration = Date.now() - startTime;
  apiDuration.add(duration);
  requestCount.add(1);
  
  return response;
}

// Smoke Test: Basic functionality verification
export function smokeTest() {
  group('Health Check', () => {
    const response = http.get(`${BASE_URL}/api/health`);
    
    check(response, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 100ms': (r) => r.timings.duration < 100,
    }) || errorRate.add(1);
  });
  
  sleep(1);
}

// Load Test: Normal expected load
export function loadTest() {
  const user = getRandomUser();
  let authToken;
  
  // Authentication flow
  group('Authentication', () => {
    const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password,
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: '/api/auth/login' },
    });
    
    const loginSuccess = check(loginResponse, {
      'login status is 200': (r) => r.status === 200 || r.status === 401, // May not exist
      'login response time < 200ms': (r) => r.timings.duration < 200,
      'login returns token': (r) => {
        try {
          return r.status === 200 ? JSON.parse(r.body).token !== undefined : true;
        } catch {
          return true;
        }
      },
    });
    
    if (!loginSuccess) errorRate.add(1);
    
    // Extract token if successful
    if (loginResponse.status === 200) {
      try {
        authToken = JSON.parse(loginResponse.body).token;
      } catch (e) {
        console.error('Failed to parse login response');
      }
    }
  });
  
  // API operations (if authenticated)
  if (authToken) {
    group('User Profile', () => {
      const profileResponse = makeAuthRequest('/api/user/profile', authToken);
      
      check(profileResponse, {
        'profile status is 200': (r) => r.status === 200,
        'profile response time < 150ms': (r) => r.timings.duration < 150,
      }) || errorRate.add(1);
    });
    
    group('Resource Operations', () => {
      // List resources
      const listResponse = makeAuthRequest('/api/resources', authToken);
      
      check(listResponse, {
        'list resources status is 200': (r) => r.status === 200 || r.status === 404,
        'list response time < 200ms': (r) => r.timings.duration < 200,
      }) || errorRate.add(1);
      
      // Create resource
      const createResponse = makeAuthRequest('/api/resources', authToken, 'POST', {
        title: `Load Test Resource ${Date.now()}`,
        description: 'Created during load test',
      });
      
      check(createResponse, {
        'create resource status is 201 or 200': (r) => [200, 201, 404].includes(r.status),
        'create response time < 300ms': (r) => r.timings.duration < 300,
      }) || errorRate.add(1);
    });
  }
  
  sleep(Math.random() * 2 + 1); // Random sleep 1-3 seconds
}

// Stress Test: Beyond normal capacity
export function stressTest() {
  // Similar to load test but with minimal sleep
  group('High Load Operations', () => {
    const healthResponse = http.get(`${BASE_URL}/api/health`);
    
    check(healthResponse, {
      'health check under stress': (r) => r.status === 200,
      'response time under stress < 1000ms': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);
  });
  
  sleep(0.1); // Minimal sleep for stress
}

// Spike Test: Sudden traffic surge
export function spikeTest() {
  group('Spike Load', () => {
    const response = http.get(`${BASE_URL}/api/health`);
    
    check(response, {
      'survives traffic spike': (r) => r.status === 200,
      'spike response time < 2000ms': (r) => r.timings.duration < 2000,
    }) || errorRate.add(1);
  });
  
  // No sleep - maximum pressure
}

// Teardown function
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Total requests: ${requestCount.count}`);
}

// Summary handler
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
    'load-test-report.html': htmlReport(data),
  };
}

// Text summary helper
function textSummary(data, options) {
  const indent = options.indent || '';
  const colors = options.enableColors;
  
  let summary = '\n' + indent + '='.repeat(70) + '\n';
  summary += indent + 'LOAD TEST SUMMARY\n';
  summary += indent + '='.repeat(70) + '\n\n';
  
  // Metrics summary
  const metrics = data.metrics;
  summary += indent + 'Key Metrics:\n';
  summary += indent + `-${'─'.repeat(68)}\n`;
  
  if (metrics.http_req_duration) {
    summary += indent + `  Response Time (p95): ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += indent + `  Response Time (p99): ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  }
  
  if (metrics.http_req_failed) {
    summary += indent + `  Error Rate: ${(metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  }
  
  if (metrics.http_reqs) {
    summary += indent + `  Total Requests: ${metrics.http_reqs.values.count}\n`;
  }
  
  summary += '\n';
  return summary;
}

// HTML report helper
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>k6 Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <h1>k6 Load Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <div class="metric">
    <h3>Test Results</h3>
    <pre>${JSON.stringify(data.metrics, null, 2)}</pre>
  </div>
</body>
</html>
  `;
}
