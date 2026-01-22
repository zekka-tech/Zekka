/**
 * Agent Test Fixtures
 * Predefined test data for agent-related tests
 */

const { faker } = require('@faker-js/faker');

// Test agents
const testAgents = [
  {
    id: 'agent-pydantic-ai',
    name: 'Pydantic AI',
    type: 'senior',
    status: 'active',
    tier: 1,
    capabilities: ['planning', 'research', 'implementation'],
    metadata: {
      model: 'claude-sonnet-4-5',
      specialty: 'high-level planning'
    },
    created_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'agent-astron',
    name: 'Astron Agent',
    type: 'coordinator',
    status: 'active',
    tier: 1,
    capabilities: ['planning', 'testing', 'coordination'],
    metadata: {
      model: 'gemini-pro',
      specialty: 'workflow coordination'
    },
    created_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'agent-autoagent',
    name: 'AutoAgent',
    type: 'developer',
    status: 'active',
    tier: 2,
    capabilities: ['implementation', 'coding'],
    metadata: {
      model: 'gemini-pro',
      specialty: 'code implementation'
    },
    created_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'agent-coderabbit',
    name: 'CodeRabbit',
    type: 'reviewer',
    status: 'active',
    tier: 3,
    capabilities: ['code-review', 'quality-analysis'],
    metadata: {
      specialty: 'pull request reviews'
    },
    created_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'agent-maintenance',
    name: 'Maintenance Agent',
    type: 'support',
    status: 'inactive',
    tier: 4,
    capabilities: ['maintenance', 'monitoring'],
    metadata: {},
    created_at: new Date('2024-01-01').toISOString()
  }
];

// Test agent tasks
const testAgentTasks = [
  {
    id: 't1111111-1111-1111-1111-111111111111',
    agent_id: 'agent-pydantic-ai',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    title: 'Architecture Planning',
    description: 'Design system architecture',
    status: 'completed',
    priority: 'high',
    created_at: new Date('2024-01-01T09:00:00').toISOString(),
    started_at: new Date('2024-01-01T09:05:00').toISOString(),
    completed_at: new Date('2024-01-01T10:30:00').toISOString()
  },
  {
    id: 't2222222-2222-2222-2222-222222222222',
    agent_id: 'agent-autoagent',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    title: 'Implement User Service',
    description: 'Create user authentication service',
    status: 'in_progress',
    priority: 'high',
    created_at: new Date('2024-01-01T11:00:00').toISOString(),
    started_at: new Date('2024-01-01T11:05:00').toISOString(),
    completed_at: null
  },
  {
    id: 't3333333-3333-3333-3333-333333333333',
    agent_id: 'agent-coderabbit',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    title: 'Code Review - PR #123',
    description: 'Review pull request changes',
    status: 'pending',
    priority: 'medium',
    created_at: new Date('2024-01-01T12:00:00').toISOString(),
    started_at: null,
    completed_at: null
  }
];

// Test agent activity logs
const testAgentActivity = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    agent_id: 'agent-pydantic-ai',
    action: 'task_started',
    task_id: 't1111111-1111-1111-1111-111111111111',
    details: { message: 'Started architecture planning' },
    timestamp: new Date('2024-01-01T09:05:00').toISOString()
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    agent_id: 'agent-pydantic-ai',
    action: 'task_completed',
    task_id: 't1111111-1111-1111-1111-111111111111',
    details: { message: 'Completed architecture design', duration: 5100000 },
    timestamp: new Date('2024-01-01T10:30:00').toISOString()
  }
];

/**
 * Create a random agent
 */
function createRandomAgent(overrides = {}) {
  return {
    id: `agent-${faker.string.alphanumeric(8)}`,
    name: faker.company.name(),
    type: faker.helpers.arrayElement(['senior', 'developer', 'reviewer', 'support']),
    status: 'active',
    tier: faker.number.int({ min: 1, max: 4 }),
    capabilities: ['implementation'],
    metadata: {},
    created_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create agent task
 */
function createAgentTask(overrides = {}) {
  return {
    id: faker.string.uuid(),
    agent_id: faker.string.alphanumeric(8),
    project_id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    status: 'pending',
    priority: 'medium',
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    ...overrides
  };
}

/**
 * Create agent activity log
 */
function createAgentActivity(overrides = {}) {
  return {
    id: faker.string.uuid(),
    agent_id: faker.string.alphanumeric(8),
    action: 'task_started',
    task_id: faker.string.uuid(),
    details: {},
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

module.exports = {
  testAgents,
  testAgentTasks,
  testAgentActivity,
  createRandomAgent,
  createAgentTask,
  createAgentActivity,

  // Export specific agents
  pydanticAgent: testAgents[0],
  astronAgent: testAgents[1],
  autoAgent: testAgents[2],
  codeRabbitAgent: testAgents[3],
  inactiveAgent: testAgents[4]
};
