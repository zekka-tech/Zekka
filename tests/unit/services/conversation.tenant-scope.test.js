/**
 * Conversation tenant-isolation tests.
 *
 * Verifies that when a tenant context is active, list/create queries are
 * scoped to that tenant (tenant_id filter + column), and that single-tenant
 * callers (tenantId = null) are unaffected.
 */
const mockDb = { getClient: jest.fn(), query: jest.fn() };

jest.mock('../../../src/config/database', () => mockDb);
jest.mock('../../../src/middleware/websocket', () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })) }))
}));
jest.mock('../../../src/services/model-client', () => jest.fn().mockImplementation(() => ({})));
jest.mock('../../../src/services/analytics.service', () => ({
  trackTokenUsage: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn()
}));

const { ConversationService } = require('../../../src/services/conversation.service');

const TENANT = 'a1b2c3d4-0000-0000-0000-000000000099';

describe('ConversationService tenant scoping', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConversationService();
  });

  describe('listConversations', () => {
    it('adds a tenant_id filter and param when a tenant is active', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // main listing
        .mockResolvedValueOnce({ rows: [{ total: '0' }] }); // count

      await service.listConversations('user_1', null, { limit: 20 }, TENANT);

      const listCall = mockDb.query.mock.calls[0];
      expect(listCall[0]).toContain('c.tenant_id = $');
      expect(listCall[1]).toContain(TENANT);
    });

    it('does not filter by tenant when none is active', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      await service.listConversations('user_1', null, { limit: 20 }, null);

      const listCall = mockDb.query.mock.calls[0];
      expect(listCall[0]).not.toContain('c.tenant_id');
    });
  });

  describe('createConversation', () => {
    it('requires the project to belong to the tenant and tags the row', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'proj_1' }] }) // access check
        .mockResolvedValueOnce({ rows: [{ id: 'conv_1', metadata: '{}' }] }); // insert

      await service.createConversation('user_1', 'proj_1', 'Title', {}, TENANT);

      const accessCall = mockDb.query.mock.calls[0];
      expect(accessCall[0]).toContain('p.tenant_id = $');
      expect(accessCall[1]).toContain(TENANT);

      const insertCall = mockDb.query.mock.calls[1];
      expect(insertCall[0]).toContain('tenant_id');
      expect(insertCall[1]).toContain(TENANT);
    });
  });
});
