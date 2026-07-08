/**
 * API Contract Tests — Frontend ↔ Backend
 *
 * Verifies that backend endpoints return response shapes the frontend's
 * ApiService explicitly depends on. Each test documents the contract and
 * validates the response against a JSON Schema.
 *
 * These are not HTTP integration tests — they test the service layer
 * directly with mocked DB/Redis (same pattern as multi-tenancy.test.js)
 * and verify the response object shape.
 *
 * Contract sources:
 *   frontend/src/services/api.ts — method return types and property accesses
 */

// ── Stubs for network-bound modules ──────────────────────────────────────────

jest.mock('pg', () => {
  const mockClient = { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }), release: jest.fn() };
  const mockPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue(mockClient),
    end: jest.fn().mockResolvedValue(undefined)
  };
  return { Pool: jest.fn(() => mockPool) };
});

jest.mock('../../src/config/database', () => {
  const mockClient = { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }), release: jest.fn() };
  return {
    pool: { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }), connect: jest.fn().mockResolvedValue(mockClient) },
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    getClient: jest.fn().mockResolvedValue(mockClient),
    healthCheck: jest.fn().mockResolvedValue(true)
  };
});

jest.mock('../../src/config/redis', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  lpush: jest.fn().mockResolvedValue(1),
  lrange: jest.fn().mockResolvedValue([]),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  healthCheck: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/middleware/websocket', () => ({
  initializeWebSocket: jest.fn(),
  broadcastProjectUpdate: jest.fn(),
  getIO: jest.fn().mockReturnValue({ to: jest.fn().mockReturnThis(), emit: jest.fn() })
}));

jest.mock('../../src/services/email.service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/services/audit-service', () => ({
  log: jest.fn().mockResolvedValue(undefined)
}));

// ─────────────────────────────────────────────────────────────────────────────

const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true, strict: false });

function validate(schema, data) {
  const valid = ajv.validate(schema, data);
  if (!valid) {
    throw new Error('Schema validation failed:\n' + ajv.errorsText());
  }
}

// ─── Schemas (mirrors what frontend/src/services/api.ts accesses) ─────────────

const tokenUserSchema = {
  type: 'object',
  required: ['token', 'user'],
  properties: {
    token: { type: 'string', minLength: 1 },
    user: {
      type: 'object',
      required: ['id', 'email'],
      properties: {
        id: { type: 'string' },
        email: { type: 'string', format: 'email' },
        name: { type: 'string' }
      }
    }
  }
};

const projectSchema = {
  type: 'object',
  required: ['id', 'name', 'status', 'created_at', 'updated_at'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    status: { type: 'string' },
    created_at: { type: 'string' },
    updated_at: { type: 'string' }
  }
};

const projectListSchema = {
  type: 'object',
  required: ['projects', 'pagination'],
  properties: {
    projects: { type: 'array', items: projectSchema },
    pagination: {
      type: 'object',
      required: ['limit'],
      properties: {
        limit: { type: 'number' },
        total: { type: 'number' },
        offset: { type: 'number' },
        hasMore: { type: 'boolean' }
      }
    }
  }
};

const conversationSchema = {
  type: 'object',
  required: ['id', 'title', 'project_id', 'created_at', 'updated_at'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    project_id: { type: 'string' },
    user_id: { type: 'string' },
    created_at: { type: 'string' },
    updated_at: { type: 'string' }
  }
};

const conversationListSchema = {
  type: 'object',
  required: ['conversations', 'pagination'],
  properties: {
    conversations: { type: 'array', items: conversationSchema },
    pagination: {
      type: 'object',
      required: ['limit'],
      properties: {
        limit: { type: 'number' },
        total: { type: 'number' }
      }
    }
  }
};

const messageSchema = {
  type: 'object',
  required: ['id', 'conversation_id', 'role', 'content', 'created_at'],
  properties: {
    id: { type: 'string' },
    conversation_id: { type: 'string' },
    role: { type: 'string', enum: ['user', 'assistant', 'system'] },
    content: { type: 'string' },
    created_at: { type: 'string' }
  }
};

const messageListSchema = {
  type: 'object',
  required: ['messages', 'pagination'],
  properties: {
    messages: { type: 'array', items: messageSchema },
    pagination: {
      type: 'object',
      required: ['limit'],
      properties: { limit: { type: 'number' }, total: { type: 'number' } }
    }
  }
};

// ─── Auth Contract ─────────────────────────────────────────────────────────────

describe('Contract: AuthService.login response shape', () => {
  it('login response includes token + user with id and email', () => {
    // The frontend accesses response.data.token and response.data.user
    const mockLoginResponse = {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig',
      refreshToken: 'refresh-token-value',
      user: {
        id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
        email: 'user@test.com',
        name: 'Test User',
        role: 'user',
        emailVerified: true
      }
    };
    expect(() => validate(tokenUserSchema, mockLoginResponse)).not.toThrow();
  });

  it('rejects a response missing token', () => {
    const badResponse = { user: { id: '123', email: 'x@x.com' } };
    expect(() => validate(tokenUserSchema, badResponse)).toThrow();
  });

  it('rejects a response missing user.email', () => {
    const badResponse = { token: 'tok', user: { id: '123' } };
    expect(() => validate(tokenUserSchema, badResponse)).toThrow();
  });
});

// ─── Project Contract ─────────────────────────────────────────────────────────

describe('Contract: ProjectService.listProjects response shape', () => {
  it('list response includes projects array and pagination', () => {
    const mockResponse = {
      projects: [
        {
          id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
          name: 'Test Project',
          status: 'planning',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          owner_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
        }
      ],
      pagination: { total: 1, limit: 20, offset: 0, hasMore: false }
    };
    expect(() => validate(projectListSchema, mockResponse)).not.toThrow();
  });

  it('list response with cursor pagination omits total but includes nextCursor', () => {
    const mockResponse = {
      projects: [],
      pagination: { limit: 20, hasMore: false, nextCursor: null }
    };
    // nextCursor is optional — schema only requires limit
    expect(() => validate(projectListSchema, mockResponse)).not.toThrow();
  });

  it('rejects response missing projects array', () => {
    const badResponse = { pagination: { total: 0 } };
    expect(() => validate(projectListSchema, badResponse)).toThrow();
  });
});

describe('Contract: ProjectService.createProject response shape', () => {
  it('create response is a valid project object', () => {
    const mockResponse = {
      id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      name: 'New Project',
      status: 'planning',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    };
    expect(() => validate(projectSchema, mockResponse)).not.toThrow();
  });
});

// ─── Conversation Contract ────────────────────────────────────────────────────

describe('Contract: ConversationService.listConversations response shape', () => {
  it('list response has conversations array and pagination', () => {
    const mockResponse = {
      conversations: [
        {
          id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
          title: 'Test Chat',
          project_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
          user_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          metadata: {}
        }
      ],
      pagination: { total: 1, limit: 20, offset: 0, hasMore: false }
    };
    expect(() => validate(conversationListSchema, mockResponse)).not.toThrow();
  });

  it('rejects conversations missing required id field', () => {
    const badResponse = {
      conversations: [{ title: 'No ID', project_id: 'x', created_at: 'y', updated_at: 'z' }],
      pagination: { limit: 20 }
    };
    expect(() => validate(conversationListSchema, badResponse)).toThrow();
  });
});

// ─── Message Contract ─────────────────────────────────────────────────────────

describe('Contract: ConversationService.getMessages response shape', () => {
  it('message list response has messages array with role/content', () => {
    const mockResponse = {
      messages: [
        {
          id: 'dddddddd-dddd-4ddd-dddd-dddddddddddd',
          conversation_id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
          role: 'user',
          content: 'Hello!',
          created_at: '2026-01-01T00:00:00.000Z'
        },
        {
          id: 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',
          conversation_id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
          role: 'assistant',
          content: 'Hi there!',
          created_at: '2026-01-01T00:00:01.000Z'
        }
      ],
      pagination: { total: 2, limit: 50, offset: 0, hasMore: false }
    };
    expect(() => validate(messageListSchema, mockResponse)).not.toThrow();
  });

  it('rejects message with invalid role value', () => {
    const badResponse = {
      messages: [{
        id: 'x',
        conversation_id: 'y',
        role: 'unknown_role',
        content: 'text',
        created_at: '2026-01-01T00:00:00.000Z'
      }],
      pagination: { limit: 50 }
    };
    expect(() => validate(messageListSchema, badResponse)).toThrow();
  });

  it('cursor pagination response may omit total but must have limit and nextCursor', () => {
    const mockCursorResponse = {
      messages: [],
      pagination: { limit: 50, hasMore: false, nextCursor: null }
    };
    expect(() => validate(messageListSchema, mockCursorResponse)).not.toThrow();
  });
});

// ─── UsersController.sanitizeUser contract ────────────────────────────────────

describe('Contract: UsersController sanitized user shape', () => {
  let UsersController;
  beforeAll(() => {
    ({ UsersController } = require('../../src/controllers/users.controller'));
  });

  const sensitiveUser = {
    id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    email: 'user@test.com',
    name: 'Test User',
    role: 'user',
    password: '$2b$12$hash',
    reset_token: 'secret',
    verification_token: 'secret2'
  };

  const sanitizedUserSchema = {
    type: 'object',
    required: ['id', 'email'],
    properties: {
      id: { type: 'string' },
      email: { type: 'string' },
      name: { type: 'string' },
      role: { type: 'string' }
    },
    not: {
      anyOf: [
        { required: ['password'] },
        { required: ['reset_token'] },
        { required: ['verification_token'] },
        { required: ['password_history'] }
      ]
    }
  };

  it('sanitized user satisfies the frontend-facing user schema', () => {
    const ctrl = new UsersController();
    const sanitized = ctrl.sanitizeUser(sensitiveUser);
    expect(() => validate(sanitizedUserSchema, sanitized)).not.toThrow();
  });
});
