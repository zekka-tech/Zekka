/**
 * Artillery Load Test Processor
 * ==============================
 * 
 * Custom functions for Artillery load testing
 */

module.exports = {
  // Generate random string
  randomString: (context, events, done) => {
    context.vars.randomString = Math.random().toString(36).substring(7);
    return done();
  },

  // Generate random number
  randomNumber: (context, events, done) => {
    const min = 1;
    const max = 1000;
    context.vars.randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    return done();
  },

  // Generate random email
  randomEmail: (context, events, done) => {
    const randomStr = Math.random().toString(36).substring(7);
    context.vars.randomEmail = `test-${randomStr}@example.com`;
    return done();
  },

  // Before request hook
  beforeRequest: (requestParams, context, ee, next) => {
    // Add custom headers or modify request
    requestParams.headers = requestParams.headers || {};
    requestParams.headers['X-Test-Run-Id'] = context.vars.$uuid;
    requestParams.headers['X-Test-Timestamp'] = new Date().toISOString();
    return next();
  },

  // After response hook
  afterResponse: (requestParams, response, context, ee, next) => {
    // Log slow responses
    if (response.timings && response.timings.phases.total > 1000) {
      console.log(`Slow response: ${requestParams.url} took ${response.timings.phases.total}ms`);
    }
    return next();
  }
};
