/**
 * Tenant Routes
 * API routes for multi-tenant (SaaS) organization management
 *
 * Endpoints:
 * POST   /api/v1/tenants                          - Create tenant (creator becomes owner)
 * GET    /api/v1/tenants                          - List tenants for current user
 * GET    /api/v1/tenants/:tenantId                - Get tenant details (member)
 * PATCH  /api/v1/tenants/:tenantId                - Update tenant (admin+)
 * DELETE /api/v1/tenants/:tenantId                - Deactivate tenant (owner)
 * PUT    /api/v1/tenants/:tenantId/subscription   - Update subscription (owner)
 * GET    /api/v1/tenants/:tenantId/members        - List members (member)
 * POST   /api/v1/tenants/:tenantId/members        - Add member (admin+)
 * PATCH  /api/v1/tenants/:tenantId/members/:userId - Change member role (admin+)
 * DELETE /api/v1/tenants/:tenantId/members/:userId - Remove member (admin+)
 */
import express = require('express');
import type { Request, RequestHandler, Response } from 'express';
import { authenticate } from '../middleware/auth';
import errorHandlerMiddleware = require('../middleware/error-handler.middleware');
import validate = require('../middleware/validate');
import { requireTenantRole, tenantContext } from '../middleware/tenant-context';
import { tenantService } from '../services/tenant.service';
import tenantSchemas = require('../schemas/tenants.schema');

// The validation/error middleware are untyped JS modules; pin their shapes here
// until they are migrated to TypeScript.
const asyncHandler = errorHandlerMiddleware.asyncHandler as (
  fn: (req: Request, res: Response) => Promise<unknown>
) => RequestHandler;
const validateBody = validate.validateBody as (schema: unknown) => RequestHandler;
const validateParams = validate.validateParams as (schema: unknown) => RequestHandler;

const router = express.Router();

// All tenant routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/tenants:
 *   post:
 *     summary: Create a new tenant (organization)
 *     tags: [Tenants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               plan: { type: string, enum: [free, starter, pro, enterprise] }
 *     responses:
 *       201: { description: Tenant created }
 *       409: { description: Slug already taken }
 */
router.post(
  '/',
  validateBody(tenantSchemas.createTenant),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, slug, plan } = req.body;
    const tenant = await tenantService.createTenant({
      name,
      slug,
      plan,
      ownerUserId: req.user!.userId
    });
    res.status(201).json(tenant);
  })
);

/**
 * @swagger
 * /api/v1/tenants:
 *   get:
 *     summary: List tenants the current user belongs to
 *     tags: [Tenants]
 *     responses:
 *       200: { description: Tenant list with the user's role in each }
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const tenants = await tenantService.listTenantsForUser(req.user!.userId);
    res.json(tenants);
  })
);

// Tenant-scoped routes: resolve and verify tenant membership from :tenantId
const scoped = express.Router({ mergeParams: true });
scoped.use(
  validateParams(tenantSchemas.tenantIdParam),
  (req: Request, _res: Response, next: express.NextFunction) => {
    // tenantContext resolves the tenant from X-Tenant-Id; for path-addressed
    // routes the path parameter is authoritative.
    req.headers['x-tenant-id'] = req.params['tenantId'];
    next();
  },
  tenantContext
);
router.use('/:tenantId', scoped);

scoped.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const tenant = await tenantService.getTenantById(req.tenant!.id);
    res.json({ ...tenant, role: req.tenant!.role });
  })
);

scoped.patch(
  '/',
  requireTenantRole('admin'),
  validateBody(tenantSchemas.updateTenant),
  asyncHandler(async (req: Request, res: Response) => {
    const tenant = await tenantService.updateTenant(req.tenant!.id, req.body);
    res.json(tenant);
  })
);

scoped.delete(
  '/',
  requireTenantRole('owner'),
  asyncHandler(async (req: Request, res: Response) => {
    await tenantService.deactivateTenant(req.tenant!.id);
    res.status(204).send();
  })
);

scoped.put(
  '/subscription',
  requireTenantRole('owner'),
  validateBody(tenantSchemas.updateSubscription),
  asyncHandler(async (req: Request, res: Response) => {
    const tenant = await tenantService.updateSubscription(
      req.tenant!.id,
      req.body
    );
    res.json(tenant);
  })
);

scoped.get(
  '/members',
  asyncHandler(async (req: Request, res: Response) => {
    const members = await tenantService.listMembers(req.tenant!.id);
    res.json(members);
  })
);

scoped.post(
  '/members',
  requireTenantRole('admin'),
  validateBody(tenantSchemas.addMember),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = req.body;
    const member = await tenantService.addMember(
      req.tenant!.id,
      userId,
      role || 'member',
      req.user!.userId
    );
    res.status(201).json(member);
  })
);

scoped.patch(
  '/members/:userId',
  requireTenantRole('admin'),
  validateParams(tenantSchemas.memberParams),
  validateBody(tenantSchemas.updateMember),
  asyncHandler(async (req: Request, res: Response) => {
    const member = await tenantService.updateMemberRole(
      req.tenant!.id,
      req.params['userId'] as string,
      req.body.role
    );
    res.json(member);
  })
);

scoped.delete(
  '/members/:userId',
  requireTenantRole('admin'),
  validateParams(tenantSchemas.memberParams),
  asyncHandler(async (req: Request, res: Response) => {
    await tenantService.removeMember(
      req.tenant!.id,
      req.params['userId'] as string
    );
    res.status(204).send();
  })
);

export = router;
