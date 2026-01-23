/**
 * Conversation Test Fixtures
 * Predefined test data for conversation-related tests
 */

const { faker } = require('@faker-js/faker');

// Test conversations
const testConversations = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    title: 'First Conversation',
    status: 'active',
    metadata: { model: 'claude-sonnet-4-5' },
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    title: 'Second Conversation',
    status: 'active',
    metadata: { model: 'gemini-pro' },
    created_at: new Date('2024-01-02').toISOString(),
    updated_at: new Date('2024-01-02').toISOString()
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    project_id: 'p2222222-2222-2222-2222-222222222222',
    title: 'Beta Project Chat',
    status: 'active',
    metadata: {},
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString()
  },
  {
    id: 'c4444444-4444-4444-4444-444444444444',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    title: 'Archived Conversation',
    status: 'archived',
    metadata: {},
    created_at: new Date('2023-12-01').toISOString(),
    updated_at: new Date('2023-12-31').toISOString()
  }
];

// Test messages
const testMessages = [
  {
    id: 'm1111111-1111-1111-1111-111111111111',
    conversation_id: 'c1111111-1111-1111-1111-111111111111',
    role: 'user',
    content: 'Hello, how can I create a React component?',
    model: 'claude-sonnet-4-5',
    tokens: { input: 12, output: 0 },
    cost: 0.00036,
    created_at: new Date('2024-01-01T10:00:00').toISOString()
  },
  {
    id: 'm2222222-2222-2222-2222-222222222222',
    conversation_id: 'c1111111-1111-1111-1111-111111111111',
    role: 'assistant',
    content: 'I can help you create a React component...',
    model: 'claude-sonnet-4-5',
    tokens: { input: 0, output: 250 },
    cost: 0.00375,
    created_at: new Date('2024-01-01T10:00:05').toISOString()
  },
  {
    id: 'm3333333-3333-3333-3333-333333333333',
    conversation_id: 'c1111111-1111-1111-1111-111111111111',
    role: 'user',
    content: 'Can you add TypeScript types?',
    model: 'claude-sonnet-4-5',
    tokens: { input: 10, output: 0 },
    cost: 0.0003,
    created_at: new Date('2024-01-01T10:01:00').toISOString()
  },
  {
    id: 'm4444444-4444-4444-4444-444444444444',
    conversation_id: 'c2222222-2222-2222-2222-222222222222',
    role: 'user',
    content: 'Explain async/await in JavaScript',
    model: 'gemini-pro',
    tokens: { input: 8, output: 0 },
    cost: 0.000001,
    created_at: new Date('2024-01-02T11:00:00').toISOString()
  }
];

/**
 * Create a random conversation
 */
function createRandomConversation(overrides = {}) {
  return {
    id: faker.string.uuid(),
    project_id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    status: 'active',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create conversation data
 */
function createConversationData(overrides = {}) {
  return {
    title: faker.lorem.sentence(),
    metadata: { model: 'claude-sonnet-4-5' },
    ...overrides
  };
}

/**
 * Create a random message
 */
function createRandomMessage(overrides = {}) {
  return {
    id: faker.string.uuid(),
    conversation_id: faker.string.uuid(),
    role: faker.helpers.arrayElement(['user', 'assistant']),
    content: faker.lorem.paragraph(),
    model: 'claude-sonnet-4-5',
    tokens: {
      input: faker.number.int({ min: 10, max: 500 }),
      output: faker.number.int({ min: 10, max: 500 })
    },
    cost: faker.number.float({ min: 0.0001, max: 0.1, fractionDigits: 6 }),
    created_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create message data
 */
function createMessageData(overrides = {}) {
  return {
    content: faker.lorem.paragraph(),
    role: 'user',
    model: 'claude-sonnet-4-5',
    ...overrides
  };
}

module.exports = {
  testConversations,
  testMessages,
  createRandomConversation,
  createConversationData,
  createRandomMessage,
  createMessageData,

  // Export specific test data
  firstConversation: testConversations[0],
  secondConversation: testConversations[1],
  archivedConversation: testConversations[3]
};
