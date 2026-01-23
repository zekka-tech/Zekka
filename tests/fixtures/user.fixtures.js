/**
 * User Test Fixtures
 * Predefined test data for user-related tests
 */

const { faker } = require('@faker-js/faker');

// Test users with various scenarios
const testUsers = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@test.com',
    name: 'Admin User',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY7bKSZ3r/q7g9O', // Test123!@#
    role: 'admin',
    status: 'active',
    email_verified: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'user1@test.com',
    name: 'Test User One',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY7bKSZ3r/q7g9O',
    role: 'user',
    status: 'active',
    email_verified: true,
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString()
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'user2@test.com',
    name: 'Test User Two',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY7bKSZ3r/q7g9O',
    role: 'user',
    status: 'active',
    email_verified: true,
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-02-01').toISOString()
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'locked@test.com',
    name: 'Locked User',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY7bKSZ3r/q7g9O',
    role: 'user',
    status: 'locked',
    locked_until: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    failed_login_attempts: 5,
    email_verified: true,
    created_at: new Date('2024-02-15').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    email: 'expired@test.com',
    name: 'Expired Password User',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY7bKSZ3r/q7g9O',
    role: 'user',
    status: 'active',
    password_expires_at: new Date('2024-01-01').toISOString(), // Expired
    email_verified: true,
    created_at: new Date('2023-01-01').toISOString(),
    updated_at: new Date('2023-01-01').toISOString()
  }
];

/**
 * Create a dynamic user with faker
 */
function createRandomUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY7bKSZ3r/q7g9O',
    role: 'user',
    status: 'active',
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create user registration data
 */
function createUserRegistration(overrides = {}) {
  return {
    email: faker.internet.email(),
    password: 'SecurePass123!@#',
    name: faker.person.fullName(),
    ...overrides
  };
}

/**
 * Create user login credentials
 */
function createUserCredentials(overrides = {}) {
  return {
    email: 'user1@test.com',
    password: 'Test123!@#',
    ...overrides
  };
}

module.exports = {
  testUsers,
  createRandomUser,
  createUserRegistration,
  createUserCredentials,

  // Export specific test users
  adminUser: testUsers[0],
  regularUser: testUsers[1],
  secondUser: testUsers[2],
  lockedUser: testUsers[3],
  expiredPasswordUser: testUsers[4]
};
