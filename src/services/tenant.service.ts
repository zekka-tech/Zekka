/**
 * Tenant Service
 *
 * Multi-tenancy foundation for the SaaS offering: tenant (organization)
 * lifecycle, per-tenant membership with role-based access, and subscription
 * management (plan, status, billing period, seat limits).
 *
 * Tenant isolation model:
 * - Every tenant-scoped request resolves a tenant via the tenant-context
 *   middleware, which verifies active membership before attaching req.tenant.
 * - Projects carry an optional tenant_id; queries are scoped to the resolved
 *   tenant whenever tenant context is present.
 */
import type { Pool, PoolClient } from 'pg';
import db = require('../config/database');
import { AppError } from '../utils/errors';

/** Tenant roles ordered from most to least privileged. */
export const TENANT_ROLES = ['owner', 'admin', 'member', 'viewer'] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'suspended';

/** Subscription states that allow tenant-scoped API access. */
export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'trialing',
  'active'
];

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscription_status: SubscriptionStatus;
  subscription_period_start: Date | null;
  subscription_period_end: Date | null;
  seat_limit: number;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TenantMemberRow {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  invited_by: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  plan?: string;
  ownerUserId: string;
}

export interface UpdateSubscriptionInput {
  plan?: string;
  status?: SubscriptionStatus;
  periodStart?: string | null;
  periodEnd?: string | null;
  seatLimit?: number;
}

const pool: Pool = db.pool;

export class TenantService {
  // ========================================
  // Tenant lifecycle
  // ========================================

  async createTenant(input: CreateTenantInput): Promise<TenantRow> {
    const {
      name, slug, plan = 'free', ownerUserId
    } = input;

    return db.transaction(async (client: PoolClient) => {
      const existing = await client.query(
        'SELECT id FROM tenants WHERE slug = $1',
        [slug]
      );
      if (existing.rows.length > 0) {
        throw new AppError(`Tenant slug '${slug}' is already taken`, 409);
      }

      const tenantResult = await client.query(
        `INSERT INTO tenants (name, slug, plan, subscription_status, subscription_period_start)
         VALUES ($1, $2, $3, 'trialing', CURRENT_TIMESTAMP)
         RETURNING *`,
        [name, slug, plan]
      );
      const tenant = tenantResult.rows[0] as TenantRow;

      // Creator becomes the tenant owner
      await client.query(
        `INSERT INTO tenant_members (tenant_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [tenant.id, ownerUserId]
      );

      return tenant;
    });
  }

  async getTenantById(tenantId: string): Promise<TenantRow | null> {
    const result = await pool.query(
      'SELECT * FROM tenants WHERE id = $1 AND deleted_at IS NULL',
      [tenantId]
    );
    return (result.rows[0] as TenantRow | undefined) ?? null;
  }

  async getTenantBySlug(slug: string): Promise<TenantRow | null> {
    const result = await pool.query(
      'SELECT * FROM tenants WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    return (result.rows[0] as TenantRow | undefined) ?? null;
  }

  async listTenantsForUser(
    userId: string
  ): Promise<Array<TenantRow & { role: TenantRole }>> {
    const result = await pool.query(
      `SELECT t.*, tm.role
       FROM tenants t
       JOIN tenant_members tm ON tm.tenant_id = t.id
       WHERE tm.user_id = $1
         AND tm.is_active = TRUE
         AND t.is_active = TRUE
         AND t.deleted_at IS NULL
       ORDER BY t.created_at ASC`,
      [userId]
    );
    return result.rows as Array<TenantRow & { role: TenantRole }>;
  }

  async updateTenant(
    tenantId: string,
    updates: { name?: string; metadata?: Record<string, unknown> }
  ): Promise<TenantRow> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    const result = await pool.query(
      `UPDATE tenants
       SET name = COALESCE($2, name),
           metadata = COALESCE($3, metadata)
       WHERE id = $1
       RETURNING *`,
      [
        tenantId,
        updates.name ?? null,
        updates.metadata ? JSON.stringify(updates.metadata) : null
      ]
    );
    return result.rows[0] as TenantRow;
  }

  async deactivateTenant(tenantId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE tenants
       SET is_active = FALSE, deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );
    if (result.rowCount === 0) {
      throw new AppError('Tenant not found', 404);
    }
  }

  // ========================================
  // Subscription management
  // ========================================

  async updateSubscription(
    tenantId: string,
    input: UpdateSubscriptionInput
  ): Promise<TenantRow> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    const result = await pool.query(
      `UPDATE tenants
       SET plan = COALESCE($2, plan),
           subscription_status = COALESCE($3, subscription_status),
           subscription_period_start = COALESCE($4, subscription_period_start),
           subscription_period_end = COALESCE($5, subscription_period_end),
           seat_limit = COALESCE($6, seat_limit)
       WHERE id = $1
       RETURNING *`,
      [
        tenantId,
        input.plan ?? null,
        input.status ?? null,
        input.periodStart ?? null,
        input.periodEnd ?? null,
        input.seatLimit ?? null
      ]
    );
    return result.rows[0] as TenantRow;
  }

  // ========================================
  // Membership & per-tenant RBAC
  // ========================================

  async getMembership(
    tenantId: string,
    userId: string
  ): Promise<TenantMemberRow | null> {
    const result = await pool.query(
      `SELECT * FROM tenant_members
       WHERE tenant_id = $1 AND user_id = $2 AND is_active = TRUE`,
      [tenantId, userId]
    );
    return (result.rows[0] as TenantMemberRow | undefined) ?? null;
  }

  async listMembers(tenantId: string): Promise<TenantMemberRow[]> {
    // Join on users.user_id: tenant_members stores the auth-layer user
    // identifier (VARCHAR), not the users table's numeric/UUID PK.
    // LEFT JOIN so memberships survive user-record lineage differences.
    const result = await pool.query(
      `SELECT tm.*, u.email, u.name
       FROM tenant_members tm
       LEFT JOIN users u ON u.user_id = tm.user_id
       WHERE tm.tenant_id = $1 AND tm.is_active = TRUE
       ORDER BY tm.created_at ASC`,
      [tenantId]
    );
    return result.rows as TenantMemberRow[];
  }

  async addMember(
    tenantId: string,
    userId: string,
    role: TenantRole = 'member',
    invitedBy: string | null = null
  ): Promise<TenantMemberRow> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Seat-limit enforcement (subscription management)
    const seatCount = await pool.query(
      `SELECT COUNT(*)::int AS count FROM tenant_members
       WHERE tenant_id = $1 AND is_active = TRUE`,
      [tenantId]
    );
    const activeSeats = (seatCount.rows[0]?.count as number | undefined) ?? 0;
    if (activeSeats >= tenant.seat_limit) {
      throw new AppError(
        `Seat limit reached (${tenant.seat_limit}). Upgrade the subscription to add more members.`,
        402
      );
    }

    // Re-activate a previously removed membership, otherwise insert
    const result = await pool.query(
      `INSERT INTO tenant_members (tenant_id, user_id, role, invited_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, user_id)
       DO UPDATE SET role = EXCLUDED.role, invited_by = EXCLUDED.invited_by, is_active = TRUE
       RETURNING *`,
      [tenantId, userId, role, invitedBy]
    );
    return result.rows[0] as TenantMemberRow;
  }

  async updateMemberRole(
    tenantId: string,
    userId: string,
    role: TenantRole
  ): Promise<TenantMemberRow> {
    const membership = await this.getMembership(tenantId, userId);
    if (!membership) {
      throw new AppError('Membership not found', 404);
    }

    if (membership.role === 'owner' && role !== 'owner') {
      await this.assertNotLastOwner(tenantId, userId);
    }

    const result = await pool.query(
      `UPDATE tenant_members
       SET role = $3
       WHERE tenant_id = $1 AND user_id = $2 AND is_active = TRUE
       RETURNING *`,
      [tenantId, userId, role]
    );
    return result.rows[0] as TenantMemberRow;
  }

  async removeMember(tenantId: string, userId: string): Promise<void> {
    const membership = await this.getMembership(tenantId, userId);
    if (!membership) {
      throw new AppError('Membership not found', 404);
    }

    if (membership.role === 'owner') {
      await this.assertNotLastOwner(tenantId, userId);
    }

    await pool.query(
      `UPDATE tenant_members
       SET is_active = FALSE
       WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    );
  }

  /** A tenant must always retain at least one active owner. */
  private async assertNotLastOwner(
    tenantId: string,
    userId: string
  ): Promise<void> {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM tenant_members
       WHERE tenant_id = $1 AND role = 'owner' AND is_active = TRUE AND user_id <> $2`,
      [tenantId, userId]
    );
    const otherOwners = (result.rows[0]?.count as number | undefined) ?? 0;
    if (otherOwners === 0) {
      throw new AppError(
        'Cannot remove or demote the last owner of a tenant',
        409
      );
    }
  }
}

export const tenantService = new TenantService();
