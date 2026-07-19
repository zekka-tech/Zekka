/**
 * Tenant Service Unit Tests
 *
 * Tests for TenantService: tenant lifecycle, membership RBAC,
 * subscription management and seat-limit enforcement.
 */

jest.mock('../../../src/config/database', () => {
  const mockClient = { query: jest.fn() };
  return {
    pool: { query: jest.fn() },
    transaction: jest.fn(async (cb: (client: unknown) => Promise<unknown>) => cb(mockClient)),
    __mockClient: mockClient
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('../../../src/config/database');
import { TenantService } from '../../../src/services/tenant.service';

const poolQuery = db.pool.query as jest.Mock;
const clientQuery = db.__mockClient.query as jest.Mock;

const tenantRow = {
  id: 'a1b2c3d4-0000-0000-0000-000000000001',
  name: 'Acme Corp',
  slug: 'acme-corp',
  plan: 'free',
  subscription_status: 'active',
  subscription_period_start: null,
  subscription_period_end: null,
  seat_limit: 5,
  metadata: {},
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null
};

const memberRow = {
  id: 'a1b2c3d4-0000-0000-0000-000000000002',
  tenant_id: tenantRow.id,
  user_id: 'a1b2c3d4-0000-0000-0000-000000000003',
  role: 'owner',
  invited_by: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
};

describe('TenantService', () => {
  let service: TenantService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TenantService();
  });

  describe('createTenant', () => {
    it('creates the tenant and adds the creator as owner in one transaction', async () => {
      clientQuery
        .mockResolvedValueOnce({ rows: [] }) // slug uniqueness check
        .mockResolvedValueOnce({ rows: [tenantRow] }) // tenant insert
        .mockResolvedValueOnce({ rows: [] }); // owner membership insert

      const result = await service.createTenant({
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerUserId: memberRow.user_id
      });

      expect(result).toEqual(tenantRow);
      expect(db.transaction).toHaveBeenCalledTimes(1);
      const membershipCall = clientQuery.mock.calls[2];
      expect(membershipCall[0]).toContain('INSERT INTO tenant_members');
      expect(membershipCall[1]).toEqual([tenantRow.id, memberRow.user_id]);
    });

    it('rejects a duplicate slug with 409', async () => {
      clientQuery.mockResolvedValueOnce({ rows: [{ id: tenantRow.id }] });

      await expect(
        service.createTenant({
          name: 'Acme Corp',
          slug: 'acme-corp',
          ownerUserId: memberRow.user_id
        })
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('listTenantsForUser', () => {
    it('returns tenants joined with the membership role', async () => {
      poolQuery.mockResolvedValueOnce({
        rows: [{ ...tenantRow, role: 'owner' }]
      });

      const result = await service.listTenantsForUser(memberRow.user_id);

      expect(result).toHaveLength(1);
      expect(result[0]!.role).toBe('owner');
      expect(poolQuery.mock.calls[0][0]).toContain('tenant_members');
    });
  });

  describe('addMember', () => {
    it('adds a member when under the seat limit', async () => {
      poolQuery
        .mockResolvedValueOnce({ rows: [tenantRow] }) // getTenantById
        .mockResolvedValueOnce({ rows: [{ count: 2 }] }) // seat count
        .mockResolvedValueOnce({ rows: [{ ...memberRow, role: 'member' }] });

      const result = await service.addMember(
        tenantRow.id,
        memberRow.user_id,
        'member'
      );

      expect(result.role).toBe('member');
    });

    it('rejects with 402 when the seat limit is reached', async () => {
      poolQuery
        .mockResolvedValueOnce({ rows: [tenantRow] })
        .mockResolvedValueOnce({ rows: [{ count: 5 }] });

      await expect(
        service.addMember(tenantRow.id, memberRow.user_id)
      ).rejects.toMatchObject({ statusCode: 402 });
    });

    it('rejects with 404 for an unknown tenant', async () => {
      poolQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.addMember(tenantRow.id, memberRow.user_id)
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('updateMemberRole', () => {
    it('blocks demoting the last owner with 409', async () => {
      poolQuery
        .mockResolvedValueOnce({ rows: [memberRow] }) // getMembership → owner
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // no other owners

      await expect(
        service.updateMemberRole(tenantRow.id, memberRow.user_id, 'member')
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('demotes an owner when another active owner remains', async () => {
      poolQuery
        .mockResolvedValueOnce({ rows: [memberRow] })
        .mockResolvedValueOnce({ rows: [{ count: 1 }] })
        .mockResolvedValueOnce({ rows: [{ ...memberRow, role: 'admin' }] });

      const result = await service.updateMemberRole(
        tenantRow.id,
        memberRow.user_id,
        'admin'
      );

      expect(result.role).toBe('admin');
    });
  });

  describe('removeMember', () => {
    it('soft-deactivates a non-owner membership', async () => {
      poolQuery
        .mockResolvedValueOnce({ rows: [{ ...memberRow, role: 'member' }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.removeMember(tenantRow.id, memberRow.user_id);

      const updateCall = poolQuery.mock.calls[1];
      expect(updateCall[0]).toContain('SET is_active = FALSE');
    });

    it('blocks removing the last owner with 409', async () => {
      poolQuery
        .mockResolvedValueOnce({ rows: [memberRow] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await expect(
        service.removeMember(tenantRow.id, memberRow.user_id)
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('updateSubscription', () => {
    it('updates plan, status and seat limit', async () => {
      const updated = {
        ...tenantRow,
        plan: 'pro',
        subscription_status: 'active',
        seat_limit: 50
      };
      poolQuery
        .mockResolvedValueOnce({ rows: [tenantRow] }) // getTenantById
        .mockResolvedValueOnce({ rows: [updated] });

      const result = await service.updateSubscription(tenantRow.id, {
        plan: 'pro',
        status: 'active',
        seatLimit: 50
      });

      expect(result.plan).toBe('pro');
      expect(result.seat_limit).toBe(50);
    });

    it('rejects with 404 for an unknown tenant', async () => {
      poolQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.updateSubscription(tenantRow.id, { plan: 'pro' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('deactivateTenant', () => {
    it('soft-deletes the tenant', async () => {
      poolQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await service.deactivateTenant(tenantRow.id);

      expect(poolQuery.mock.calls[0][0]).toContain('deleted_at = CURRENT_TIMESTAMP');
    });

    it('rejects with 404 when nothing was updated', async () => {
      poolQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(service.deactivateTenant(tenantRow.id)).rejects.toMatchObject(
        { statusCode: 404 }
      );
    });
  });
});
