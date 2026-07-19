/**
 * Tenant Context Middleware
 *
 * Resolves the acting tenant for a request and enforces tenant isolation:
 * - The tenant is selected via the `X-Tenant-Id` header (tenant UUID or slug).
 *   When the header is absent and the user belongs to exactly one tenant,
 *   that tenant is used implicitly.
 * - Membership is verified before any tenant data is exposed; non-members
 *   receive 403 regardless of whether the tenant exists (no existence leak).
 * - Suspended/canceled subscriptions are rejected with 402 so SaaS billing
 *   state gates API access.
 *
 * Attaches `req.tenant = { id, slug, plan, subscriptionStatus, role }`.
 *
 * Must run after the auth middleware (requires req.user).
 */
import type { NextFunction, Request, Response } from 'express';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  tenantService,
  TenantRole,
  TENANT_ROLES
} from '../services/tenant.service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Privilege rank; lower index = more privileged. */
const roleRank = (role: TenantRole): number => TENANT_ROLES.indexOf(role);

export async function tenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const headerValue = req.headers['x-tenant-id'];
    const tenantRef = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    let tenantId: string | undefined;
    if (tenantRef) {
      if (UUID_PATTERN.test(tenantRef)) {
        tenantId = tenantRef;
      } else {
        const bySlug = await tenantService.getTenantBySlug(tenantRef);
        // Defer the "not found" answer to the membership check below so that
        // non-members cannot probe which slugs exist.
        tenantId = bySlug?.id;
      }
    } else {
      // No explicit tenant: fall back to the user's only tenant, if unambiguous
      const memberships = await tenantService.listTenantsForUser(userId);
      if (memberships.length === 1 && memberships[0]) {
        tenantId = memberships[0].id;
      } else if (memberships.length > 1) {
        res.status(400).json({
          error:
            'Multiple tenants available — specify one with the X-Tenant-Id header'
        });
        return;
      }
    }

    if (!tenantId) {
      res.status(403).json({ error: 'No tenant context for this request' });
      return;
    }

    const membership = await tenantService.getMembership(tenantId, userId);
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this tenant' });
      return;
    }

    const tenant = await tenantService.getTenantById(tenantId);
    if (!tenant || !tenant.is_active) {
      res.status(403).json({ error: 'Tenant is not active' });
      return;
    }

    if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(tenant.subscription_status)) {
      res.status(402).json({
        error: `Tenant subscription is ${tenant.subscription_status} — access is suspended`
      });
      return;
    }

    req.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      plan: tenant.plan,
      subscriptionStatus: tenant.subscription_status,
      role: membership.role
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional variant for routes that work with or without tenant scoping:
 * resolves tenant context only when an X-Tenant-Id header is supplied,
 * so single-tenant deployments keep working unchanged.
 */
export async function optionalTenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.headers['x-tenant-id'] || !req.user?.userId) {
    next();
    return;
  }
  await tenantContext(req, res, next);
}

/**
 * Require a minimum tenant role, e.g. requireTenantRole('admin') allows
 * owners and admins. Must run after tenantContext.
 */
export function requireTenantRole(minimumRole: TenantRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      res.status(403).json({ error: 'No tenant context for this request' });
      return;
    }

    if (roleRank(req.tenant.role as TenantRole) > roleRank(minimumRole)) {
      res.status(403).json({
        error: `Requires tenant role '${minimumRole}' or higher`
      });
      return;
    }

    next();
  };
}
