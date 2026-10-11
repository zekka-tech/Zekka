/**
 * Agent Registry Routes
 * Discover and manage pluggable, versioned agents.
 *
 *   GET    /api/v1/agent-registry            - List available agents (scope-aware)
 *   GET    /api/v1/agent-registry/:key       - Latest active version of an agent
 *   GET    /api/v1/agent-registry/:key/versions - All versions of an agent
 *   POST   /api/v1/agent-registry            - Register a new agent/version
 *   DELETE /api/v1/agent-registry/:key/:version - Deactivate a version
 *
 * Reads are tenant-aware (optional X-Tenant-Id). Writes register under the
 * active tenant scope when a tenant context is present, otherwise globally.
 */
import express = require('express');
import type { Request, RequestHandler, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { optionalTenantContext } from '../middleware/tenant-context';
import errorHandlerMiddleware = require('../middleware/error-handler.middleware');
import validate = require('../middleware/validate');
import { agentRegistryService } from '../services/agent-registry.service';
import agentRegistrySchemas = require('../schemas/agent-registry.schema');

const asyncHandler = errorHandlerMiddleware.asyncHandler as (
  fn: (req: Request, res: Response) => Promise<unknown>
) => RequestHandler;
const validateBody = validate.validateBody as (schema: unknown) => RequestHandler;

const router = express.Router();
router.use(authenticate);
router.use(optionalTenantContext);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const agents = await agentRegistryService.listAgents(req.tenant?.id ?? null);
    res.json({ success: true, data: agents });
  })
);

router.get(
  '/:key',
  asyncHandler(async (req: Request, res: Response) => {
    const agent = await agentRegistryService.getAgent(
      req.params['key'] as string,
      req.tenant?.id ?? null
    );
    if (!agent) {
      res.status(404).json({ success: false, error: 'Agent not found' });
      return;
    }
    res.json({ success: true, data: agent });
  })
);

router.get(
  '/:key/versions',
  asyncHandler(async (req: Request, res: Response) => {
    const versions = await agentRegistryService.getVersions(
      req.params['key'] as string,
      req.tenant?.id ?? null
    );
    res.json({ success: true, data: versions });
  })
);

router.post(
  '/',
  validateBody(agentRegistrySchemas.registerAgent),
  asyncHandler(async (req: Request, res: Response) => {
    const agent = await agentRegistryService.registerAgent(
      req.body,
      req.tenant?.id ?? null
    );
    res.status(201).json({ success: true, data: agent });
  })
);

router.delete(
  '/:key/:version',
  asyncHandler(async (req: Request, res: Response) => {
    await agentRegistryService.deactivateAgent(
      req.params['key'] as string,
      parseInt(req.params['version'] as string, 10),
      req.tenant?.id ?? null
    );
    res.status(204).send();
  })
);

export = router;
