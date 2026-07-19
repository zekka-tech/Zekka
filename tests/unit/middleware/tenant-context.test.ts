/**
 * Tenant Context Middleware Unit Tests
 *
 * Tests tenant resolution, membership enforcement (isolation),
 * subscription gating, and role-based access control.
 */

jest.mock('../../../src/services/tenant.service', () => {
  const actual = jest.requireActual('../../../src/services/tenant.service');
  return {
    ...actual,
    tenantService: {
      getTenantById: jest.fn(),
      getTenantBySlug: jest.fn(),
      getMembership: jest.fn(),
      listTenantsForUser: jest.fn()
    }
  };
});

import {
  optionalTenantContext,
  requireTenantRole,
  tenantContext
} from '../../../src/middleware/tenant-context';
import { tenantService } from '../../../src/services/tenant.service';

const mocked = tenantService as jest.Mocked<typeof tenantService>;

const TENANT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const USER_ID = 'a1b2c3d4-0000-0000-0000-000000000003';

const tenant = {
  id: TENANT_ID,
  name: 'Acme Corp',
  slug: 'acme-corp',
  plan: 'pro',
  subscription_status: 'active',
  subscription_period_start: null,
  subscription_period_end: null,
  seat_limit: 5,
  metadata: {},
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null
} as never;

const membership = {
  id: 'm-1',
  tenant_id: TENANT_ID,
  user_id: USER_ID,
  role: 'admin',
  invited_by: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
} as never;

function makeReqRes(overrides: Record<string, unknown> = {}) {
  const req = {
    headers: {} as Record<string, string>,
    user: { userId: USER_ID },
    ...overrides
  } as never as import('express').Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  } as never as import('express').Response;

  const next = jest.fn();
  return { req, res, next };
}

describe('tenantContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no authenticated user is present', async () => {
    const { req, res, next } = makeReqRes({ user: undefined });

    await tenantContext(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('resolves tenant from X-Tenant-Id header and attaches req.tenant', async () => {
    const { req, res, next } = makeReqRes();
    req.headers['x-tenant-id'] = TENANT_ID;
    mocked.getMembership.mockResolvedValue(membership);
    mocked.getTenantById.mockResolvedValue(tenant);

    await tenantContext(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.tenant).toEqual({
      id: TENANT_ID,
      slug: 'acme-corp',
      plan: 'pro',
      subscriptionStatus: 'active',
      role: 'admin'
    });
  });

  it('resolves tenant by slug', async () => {
    const { req, res, next } = makeReqRes();
    req.headers['x-tenant-id'] = 'acme-corp';
    mocked.getTenantBySlug.mockResolvedValue(tenant);
    mocked.getMembership.mockResolvedValue(membership);
    mocked.getTenantById.mockResolvedValue(tenant);

    await tenantContext(req, res, next);

    expect(mocked.getTenantBySlug).toHaveBeenCalledWith('acme-corp');
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects non-members with 403 (tenant isolation)', async () => {
    const { req, res, next } = makeReqRes();
    req.headers['x-tenant-id'] = TENANT_ID;
    mocked.getMembership.mockResolvedValue(null);

    await tenantContext(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects suspended subscriptions with 402', async () => {
    const { req, res, next } = makeReqRes();
    req.headers['x-tenant-id'] = TENANT_ID;
    mocked.getMembership.mockResolvedValue(membership);
    mocked.getTenantById.mockResolvedValue({
      ...(tenant as Record<string, unknown>),
      subscription_status: 'suspended'
    } as never);

    await tenantContext(req, res, next);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(next).not.toHaveBeenCalled();
  });

  it('falls back to the single tenant of the user when no header is given', async () => {
    const { req, res, next } = makeReqRes();
    mocked.listTenantsForUser.mockResolvedValue([
      { ...(tenant as Record<string, unknown>), role: 'admin' } as never
    ]);
    mocked.getMembership.mockResolvedValue(membership);
    mocked.getTenantById.mockResolvedValue(tenant);

    await tenantContext(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.tenant?.id).toBe(TENANT_ID);
  });

  it('returns 400 when the user has multiple tenants and no header', async () => {
    const { req, res, next } = makeReqRes();
    mocked.listTenantsForUser.mockResolvedValue([
      { ...(tenant as Record<string, unknown>), role: 'admin' } as never,
      {
        ...(tenant as Record<string, unknown>),
        id: 'other',
        role: 'member'
      } as never
    ]);

    await tenantContext(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('optionalTenantContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes through without tenant when no header is supplied', async () => {
    const { req, res, next } = makeReqRes();

    await optionalTenantContext(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.tenant).toBeUndefined();
    expect(mocked.getMembership).not.toHaveBeenCalled();
  });

  it('enforces membership when a header is supplied', async () => {
    const { req, res, next } = makeReqRes();
    req.headers['x-tenant-id'] = TENANT_ID;
    mocked.getMembership.mockResolvedValue(null);

    await optionalTenantContext(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('requireTenantRole', () => {
  it('allows equal or higher roles', () => {
    const { req, res, next } = makeReqRes();
    req.tenant = {
      id: TENANT_ID,
      slug: 'acme-corp',
      plan: 'pro',
      subscriptionStatus: 'active',
      role: 'owner'
    };

    requireTenantRole('admin')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects lower roles with 403', () => {
    const { req, res, next } = makeReqRes();
    req.tenant = {
      id: TENANT_ID,
      slug: 'acme-corp',
      plan: 'pro',
      subscriptionStatus: 'active',
      role: 'member'
    };

    requireTenantRole('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when tenant context is missing', () => {
    const { req, res, next } = makeReqRes();

    requireTenantRole('viewer')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
