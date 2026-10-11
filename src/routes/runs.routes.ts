/**
 * Agent Run Routes
 * Read access to durable agent runs + their event stream for the run inspector.
 * Live updates arrive over Socket.IO (room `run:<id>` / `project:<id>`); these
 * endpoints provide history and resume-after-reconnect replay.
 *
 *   GET /api/v1/runs                 - List runs (filter by projectId)
 *   GET /api/v1/runs/:runId          - A single run's summary
 *   GET /api/v1/runs/:runId/events   - Events for a run (after=<eventId> for replay)
 */
import express = require('express');
import type { Request, RequestHandler, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { optionalTenantContext } from '../middleware/tenant-context';
import errorHandlerMiddleware = require('../middleware/error-handler.middleware');

// run-tracker is an untyped JS service module.
const { runTrackerService } = require('../services/run-tracker.service');

const asyncHandler = errorHandlerMiddleware.asyncHandler as (
  fn: (req: Request, res: Response) => Promise<unknown>
) => RequestHandler;

const router = express.Router();
router.use(authenticate);
router.use(optionalTenantContext);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const runs = await runTrackerService.listRuns({
      projectId: (req.query['projectId'] as string) || null,
      tenantId: req.tenant?.id ?? null,
      limit: parseInt((req.query['limit'] as string) || '50', 10)
    });
    res.json({ success: true, data: runs });
  })
);

router.get(
  '/:runId',
  asyncHandler(async (req: Request, res: Response) => {
    const run = await runTrackerService.getRun(req.params['runId'] as string);
    if (!run) {
      res.status(404).json({ success: false, error: 'Run not found' });
      return;
    }
    res.json({ success: true, data: run });
  })
);

router.get(
  '/:runId/events',
  asyncHandler(async (req: Request, res: Response) => {
    const after = parseInt((req.query['after'] as string) || '0', 10);
    const events = await runTrackerService.listEvents(
      req.params['runId'] as string,
      Number.isFinite(after) ? after : 0
    );
    res.json({ success: true, data: events });
  })
);

export = router;
