/**
 * Artillery Processor - Custom Functions for Load Testing
 * 
 * Provides custom logic for Artillery load tests:
 * - Data generation
 * - Request manipulation
 * - Response validation
 * - Custom metrics
 */

const crypto = require('crypto');

/**
 * Generate random string for unique data
 */
function generateRandomString(length = 10) {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

/**
 * Before scenario hook
 */
function beforeScenario(context, events, done) {
  // Add custom variables to context
  context.vars.timestamp = Date.now();
  context.vars.randomId = generateRandomString(8);
  return done();
}

/**
 * After response hook
 */
function afterResponse(requestParams, response, context, events, done) {
  // Log slow requests
  if (response.timings && response.timings.phases) {
    const totalTime = Object.values(response.timings.phases).reduce((a, b) => a + b, 0);
    
    if (totalTime > 1000) {
      console.log(`Slow request detected: ${requestParams.url} took ${totalTime}ms`);
    }
  }
  
  // Custom metric for API response times
  if (requestParams.url.includes('/api/')) {
    events.emit('customStat', {
      stat: 'api_response_time',
      value: response.timings.phases.firstByte || 0
    });
  }
  
  return done();
}

/**
 * Custom function to generate test data
 */
function generateTestUser(context, events, done) {
  context.vars.testUser = {
    email: `test-${generateRandomString(8)}@example.com`,
    password: 'TestPassword123!@#',
    firstName: 'Test',
    lastName: `User${Date.now()}`,
  };
  return done();
}

/**
 * Custom function to validate response structure
 */
function validateResponse(requestParams, response, context, events, done) {
  if (response.statusCode === 200) {
    try {
      const body = JSON.parse(response.body);
      
      // Check if response has expected structure
      if (!body.success && !body.data && !body.error) {
        console.error(`Unexpected response structure from ${requestParams.url}`);
        events.emit('customStat', {
          stat: 'invalid_response_structure',
          value: 1
        });
      }
    } catch (error) {
      console.error(`Failed to parse response: ${error.message}`);
    }
  }
  
  return done();
}

/**
 * Custom function to simulate user think time
 */
function thinkTime(context, events, done) {
  const thinkTimeMs = Math.random() * 3000 + 1000; // 1-4 seconds
  setTimeout(done, thinkTimeMs);
}

/**
 * Custom function to log scenario completion
 */
function logScenarioComplete(context, events, done) {
  console.log(`Scenario completed for user: ${context.vars.testEmail || 'unknown'}`);
  return done();
}

module.exports = {
  beforeScenario,
  afterResponse,
  generateTestUser,
  validateResponse,
  thinkTime,
  logScenarioComplete,
  
  // Export for use in scenarios
  generateRandomString: () => generateRandomString(),
};
