/**
 * Project Test Fixtures
 * Predefined test data for project-related tests
 */

const { faker } = require('@faker-js/faker');

// Test projects
const testProjects = [
  {
    id: 'p1111111-1111-1111-1111-111111111111',
    name: 'Alpha Project',
    description: 'First test project for alpha testing',
    owner_id: '11111111-1111-1111-1111-111111111111',
    status: 'active',
    settings: { theme: 'dark', notifications: true },
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'p2222222-2222-2222-2222-222222222222',
    name: 'Beta Project',
    description: 'Second test project for beta testing',
    owner_id: '22222222-2222-2222-2222-222222222222',
    status: 'active',
    settings: { theme: 'light', notifications: false },
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString()
  },
  {
    id: 'p3333333-3333-3333-3333-333333333333',
    name: 'Gamma Project',
    description: 'Third test project',
    owner_id: '22222222-2222-2222-2222-222222222222',
    status: 'active',
    settings: {},
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-02-01').toISOString()
  },
  {
    id: 'p4444444-4444-4444-4444-444444444444',
    name: 'Archived Project',
    description: 'Archived test project',
    owner_id: '33333333-3333-3333-3333-333333333333',
    status: 'archived',
    settings: {},
    created_at: new Date('2023-01-01').toISOString(),
    updated_at: new Date('2023-12-31').toISOString()
  }
];

/**
 * Project members
 */
const testProjectMembers = [
  {
    project_id: 'p1111111-1111-1111-1111-111111111111',
    user_id: '22222222-2222-2222-2222-222222222222',
    role: 'editor',
    added_at: new Date('2024-01-02').toISOString()
  },
  {
    project_id: 'p1111111-1111-1111-1111-111111111111',
    user_id: '33333333-3333-3333-3333-333333333333',
    role: 'viewer',
    added_at: new Date('2024-01-03').toISOString()
  }
];

/**
 * Create a random project
 */
function createRandomProject(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    owner_id: faker.string.uuid(),
    status: 'active',
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create project creation data
 */
function createProjectData(overrides = {}) {
  return {
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    settings: { theme: 'dark' },
    ...overrides
  };
}

/**
 * Create project member data
 */
function createProjectMember(overrides = {}) {
  return {
    user_id: faker.string.uuid(),
    role: 'editor',
    ...overrides
  };
}

module.exports = {
  testProjects,
  testProjectMembers,
  createRandomProject,
  createProjectData,
  createProjectMember,

  // Export specific test projects
  alphaProject: testProjects[0],
  betaProject: testProjects[1],
  gammaProject: testProjects[2],
  archivedProject: testProjects[3]
};
