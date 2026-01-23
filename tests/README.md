/**
 * Testing Guide for Zekka Framework
 * Comprehensive testing documentation and best practices
 */

# Zekka Framework Testing Suite

This document provides comprehensive guidance on writing and running tests for the Zekka Framework backend.

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Fixtures](#test-fixtures)
6. [Test Helpers](#test-helpers)
7. [Mocking Patterns](#mocking-patterns)
8. [Best Practices](#best-practices)
9. [Coverage Requirements](#coverage-requirements)

## Overview

The Zekka Framework uses **Jest** as the test runner with comprehensive unit, integration, and end-to-end tests. Our target is **80%+ code coverage** across all modules.

### Testing Philosophy

- **Test behavior, not implementation**: Focus on what the code does, not how it does it
- **Isolate units**: Use mocks to isolate the unit under test
- **Test edge cases**: Cover happy path, error cases, and edge cases
- **Keep tests fast**: Unit tests should run in milliseconds
- **Make tests readable**: Tests are documentation

## Test Structure

```
tests/
├── setup.js                    # Global test configuration
├── fixtures/                   # Test data
│   ├── user.fixtures.js
│   ├── project.fixtures.js
│   ├── conversation.fixtures.js
│   └── agent.fixtures.js
├── helpers/                    # Test utilities
│   ├── database.helper.js
│   ├── auth.helper.js
│   ├── request.helper.js
│   └── assertion.helper.js
├── unit/                       # Unit tests
│   └── services/
│       ├── auth.service.test.js
│       ├── project.service.test.js
│       ├── conversation.service.test.js
│       ├── agent.service.test.js
│       └── analytics.service.test.js
├── integration/                # Integration tests
│   ├── routes/
│   │   ├── auth.routes.test.js
│   │   ├── projects.routes.test.js
│   │   ├── conversations.routes.test.js
│   │   ├── analytics.routes.test.js
│   │   └── agents.routes.test.js
│   └── middleware/
│       ├── auth.middleware.test.js
│       └── validation.middleware.test.js
└── e2e/                        # End-to-end tests
    ├── auth.flow.test.js
    ├── project.flow.test.js
    ├── chat.flow.test.js
    └── analytics.flow.test.js
```

## Running Tests

### All Tests

```bash
npm test
```

### Unit Tests Only

```bash
npm run test:unit
```

### Integration Tests Only

```bash
npm run test:integration
```

### End-to-End Tests Only

```bash
npm run test:e2e
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### Specific Test File

```bash
npm test -- auth.service.test.js
```

### Specific Test Suite

```bash
npm test -- --testNamePattern="register"
```

## Writing Tests

### Unit Test Example

```javascript
const { AuthService } = require('../../../src/services/auth.service');
const { createRandomUser } = require('../../fixtures/user.fixtures');

describe('AuthService', () => {
  let authService;
  let mockUserRepository;

  beforeEach(() => {
    mockUserRepository = global.testUtils.createMockRepository();
    authService = new AuthService(mockUserRepository, config);
  });

  it('should register a new user', async () => {
    const userData = { email: 'test@test.com', password: 'Test123!@#', name: 'Test' };
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.create.mockResolvedValue(createRandomUser(userData));

    const result = await authService.register(userData);

    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('token');
    expect(mockUserRepository.create).toHaveBeenCalled();
  });
});
```

### Integration Test Example

```javascript
const request = require('supertest');
const app = require('../../../src/index');
const { generateAuthHeader } = require('../../helpers/auth.helper');

describe('Auth Routes', () => {
  it('POST /auth/register should create new user', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'newuser@test.com',
        password: 'SecurePass123!@#',
        name: 'New User'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('token');
  });

  it('GET /auth/me should return current user', async () => {
    const headers = generateAuthHeader();
    const response = await request(app)
      .get('/auth/me')
      .set(headers);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email');
  });
});
```

### E2E Test Example

```javascript
describe('Complete Registration Flow', () => {
  it('should register, login, and access protected resource', async () => {
    // 1. Register
    const registerResponse = await request(app)
      .post('/auth/register')
      .send(userData);

    expect(registerResponse.status).toBe(201);
    const { token } = registerResponse.body;

    // 2. Access protected route
    const profileResponse = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(profileResponse.status).toBe(200);

    // 3. Logout
    const logoutResponse = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutResponse.status).toBe(200);
  });
});
```

## Test Fixtures

Test fixtures provide reusable test data. Use them to maintain consistency across tests.

### Using Fixtures

```javascript
const { testUsers, createRandomUser } = require('../../fixtures/user.fixtures');
const { testProjects, createRandomProject } = require('../../fixtures/project.fixtures');

// Use predefined test data
const admin = testUsers[0];
const project = testProjects[0];

// Generate random test data
const newUser = createRandomUser({ role: 'admin' });
const newProject = createRandomProject({ owner_id: newUser.id });
```

### Available Fixtures

- **user.fixtures.js**: Test users, registration data, credentials
- **project.fixtures.js**: Test projects, project members
- **conversation.fixtures.js**: Test conversations, messages
- **agent.fixtures.js**: Test agents, tasks, activity logs

## Test Helpers

Helpers provide utilities for common testing tasks.

### Database Helper

```javascript
const { dbHelper } = require('../../helpers/database.helper');

beforeEach(async () => {
  await dbHelper.beginTransaction();
});

afterEach(async () => {
  await dbHelper.rollbackTransaction();
});

// Seed test data
await dbHelper.seed('users', testUsers);

// Mock database responses
const mockResult = dbHelper.mockQueryResult([user]);
```

### Auth Helper

```javascript
const { generateToken, generateAuthHeader } = require('../../helpers/auth.helper');

// Generate JWT token
const token = generateToken({ userId: '123' });

// Generate auth headers
const headers = generateAuthHeader(token);

// Create authenticated request
const authReq = createAuthRequest(user);
```

### Request Helper

```javascript
const {
  createMockRequest,
  createMockResponse,
  createMockNext
} = require('../../helpers/request.helper');

const req = createMockRequest({
  body: { email: 'test@test.com' },
  user: { id: '123' }
});

const res = createMockResponse();
const next = createMockNext();

await middleware(req, res, next);

expect(res.status).toHaveBeenCalledWith(200);
expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
```

### Assertion Helper

```javascript
const {
  assertValidUUID,
  assertValidEmail,
  assertPaginationResponse,
  assertNoSensitiveData
} = require('../../helpers/assertion.helper');

assertValidUUID(user.id);
assertValidEmail(user.email);
assertPaginationResponse(response, 1, 10);
assertNoSensitiveData(response.body);
```

## Mocking Patterns

### Mock Repository

```javascript
const mockRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

mockRepository.findById.mockResolvedValue(user);
mockRepository.create.mockResolvedValue(newUser);
```

### Mock External Services

```javascript
jest.mock('../../../src/services/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue(true)
  }))
}));
```

### Mock Database

```javascript
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  }))
}));
```

## Best Practices

### 1. Arrange-Act-Assert Pattern

```javascript
it('should do something', async () => {
  // Arrange: Set up test data and mocks
  const user = createRandomUser();
  mockRepository.findById.mockResolvedValue(user);

  // Act: Execute the code under test
  const result = await service.getUser(user.id);

  // Assert: Verify the results
  expect(result).toEqual(user);
  expect(mockRepository.findById).toHaveBeenCalledWith(user.id);
});
```

### 2. Test One Thing Per Test

```javascript
// Good: Single responsibility
it('should return 404 when user not found', async () => {
  mockRepository.findById.mockResolvedValue(null);
  await expect(service.getUser('invalid-id')).rejects.toThrow('User not found');
});

// Bad: Testing multiple concerns
it('should handle various user scenarios', async () => {
  // Tests multiple things at once
});
```

### 3. Use Descriptive Test Names

```javascript
// Good: Descriptive
it('should reject registration when email already exists', async () => {});

// Bad: Vague
it('test register', async () => {});
```

### 4. Don't Test Implementation Details

```javascript
// Good: Test behavior
it('should hash password before saving', async () => {
  await service.register(userData);
  const savedUser = mockRepository.create.mock.calls[0][0];
  expect(savedUser.password).not.toBe(userData.password);
});

// Bad: Testing internal method calls
it('should call bcrypt.hash', async () => {
  await service.register(userData);
  expect(bcrypt.hash).toHaveBeenCalled(); // Too coupled to implementation
});
```

### 5. Clean Up After Tests

```javascript
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await dbHelper.close();
});
```

### 6. Avoid Test Interdependence

```javascript
// Good: Each test is independent
it('test A', () => {
  const data = createTestData();
  // ... test logic
});

it('test B', () => {
  const data = createTestData();
  // ... test logic
});

// Bad: Tests depend on each other
let sharedData;
it('test A', () => {
  sharedData = createTestData();
});

it('test B', () => {
  // Uses sharedData from test A
});
```

## Coverage Requirements

Our coverage targets:

- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 80%+
- **Statements**: 80%+

### Viewing Coverage

```bash
npm run test:coverage
```

Coverage reports are generated in `/coverage` directory:

- **HTML Report**: `coverage/lcov-report/index.html`
- **Terminal Summary**: Printed after test run
- **JSON Report**: `coverage/coverage-final.json`

### Improving Coverage

1. **Identify uncovered code**: Check coverage report
2. **Write missing tests**: Focus on uncovered lines
3. **Test edge cases**: Error handling, boundary conditions
4. **Test error paths**: Exceptions, validation failures

### Files Excluded from Coverage

- `/src/cli/**` - CLI scripts
- `/src/types/**` - Type definitions
- `*.d.ts` - TypeScript declarations
- Configuration files

## Troubleshooting

### Tests Timing Out

Increase timeout in test:

```javascript
it('slow test', async () => {
  // ... test logic
}, 10000); // 10 second timeout
```

### Mock Not Working

Ensure mock is defined before import:

```javascript
jest.mock('../service');
const service = require('../service');
```

### Database Connection Issues

Check test database environment variables in `tests/setup.js`:

```javascript
process.env.DB_NAME = 'zekka_test';
process.env.DB_HOST = 'localhost';
```

### Port Already in Use

Ensure no other instances are running:

```bash
lsof -ti:3000 | xargs kill -9
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
- [Zekka Architecture](../ARCHITECTURE.md)

## Support

For testing questions:

1. Check this documentation
2. Review existing test examples
3. Ask in team channel
4. Create an issue on GitHub

---

**Happy Testing!**
