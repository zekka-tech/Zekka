/**
 * Stripe Webhook Handler
 *
 * Mounted in index.ts at POST /webhooks/stripe with express.raw() BEFORE the
 * global JSON body parser, because signature verification needs the exact raw
 * request bytes. The path sits outside /api so it bypasses CSRF naturally.
 */
import type { Request, Response } from 'express';
import { billingService } from '../services/billing.service';
import logger = require('../utils/logger');

export async function stripeWebhookHandler(
  req: Request,
  res: Response
): Promise<void> {
  if (!billingService.isEnabled) {
    res.status(503).json({ error: 'Billing is not enabled' });
    return;
  }

  const signature = req.headers['stripe-signature'];
  if (!signature || Array.isArray(signature)) {
    res.status(400).json({ error: 'Missing Stripe-Signature header' });
    return;
  }

  let event;
  try {
    // req.body is a Buffer because of express.raw()
    event = billingService.constructWebhookEvent(
      req.body as Buffer,
      signature
    );
  } catch (err) {
    logger.warn(`billing webhook rejected: ${(err as Error).message}`);
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  try {
    await billingService.handleWebhookEvent(event);
    // Always 200 once verified+processed so Stripe stops retrying.
    res.json({ received: true });
  } catch (err) {
    logger.error(`billing webhook processing failed: ${(err as Error).message}`);
    // 500 asks Stripe to retry later.
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
