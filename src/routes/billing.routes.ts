/**
 * Billing Routes
 * Stripe-backed billing for tenants.
 *
 * Endpoints (all tenant-scoped via :tenantId, owner-only except usage read):
 *   POST /api/v1/billing/:tenantId/checkout  - Start a subscription checkout
 *   POST /api/v1/billing/:tenantId/portal    - Open the Stripe Billing Portal
 *   GET  /api/v1/billing/:tenantId/usage     - Metered usage summary (admin+)
 *
 * The Stripe webhook is mounted separately in index.ts (raw body, no CSRF)
 * via ./billing.webhook.
 */
import express = require('express');
import type { Request, RequestHandler, Response } from 'express';
import { authenticate } from '../middleware/auth';
import errorHandlerMiddleware = require('../middleware/error-handler.middleware');
import validate = require('../middleware/validate');
import { requireTenantRole, tenantContext } from '../middleware/tenant-context';
import { billingService } from '../services/billing.service';
import billingSchemas = require('../schemas/billing.schema');

const asyncHandler = errorHandlerMiddleware.asyncHandler as (
  fn: (req: Request, res: Response) => Promise<unknown>
) => RequestHandler;
const validateBody = validate.validateBody as (schema: unknown) => RequestHandler;
const validateParams = validate.validateParams as (schema: unknown) => RequestHandler;
const validateQuery = validate.validateQuery as (schema: unknown) => RequestHandler;

const router = express.Router();
router.use(authenticate);

// Resolve tenant context from the path parameter (authoritative for billing).
const scoped = express.Router({ mergeParams: true });
scoped.use(
  validateParams(billingSchemas.tenantIdParam),
  (req: Request, _res: Response, next: express.NextFunction) => {
    req.headers['x-tenant-id'] = req.params['tenantId'];
    next();
  },
  tenantContext
);
router.use('/:tenantId', scoped);

scoped.post(
  '/checkout',
  requireTenantRole('owner'),
  validateBody(billingSchemas.createCheckout),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await billingService.createCheckoutSession(
      req.tenant!.id,
      req.body.plan
    );
    res.status(201).json(result);
  })
);

scoped.post(
  '/portal',
  requireTenantRole('owner'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await billingService.createPortalSession(req.tenant!.id);
    res.json(result);
  })
);

scoped.get(
  '/usage',
  requireTenantRole('admin'),
  validateQuery(billingSchemas.usageQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const since = req.query['since'] as string | undefined;
    const summary = await billingService.getUsageSummary(req.tenant!.id, since);
    res.json(summary);
  })
);

export = router;
