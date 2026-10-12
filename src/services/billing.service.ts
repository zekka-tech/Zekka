/**
 * Billing Service
 *
 * Bridges the tenant subscription model (tenant.service) to Stripe:
 *   - Customer provisioning (one Stripe customer per tenant)
 *   - Checkout sessions (start/upgrade a subscription)
 *   - Billing Portal sessions (self-serve plan/payment management)
 *   - Webhook-driven subscription state sync (Stripe is the source of truth
 *     for subscription_status / plan / period)
 *   - Metered usage recording (usage_records) — the gross-margin engine:
 *     we record both our cost and the marked-up billed amount.
 *
 * Stripe is initialised lazily so the rest of the app boots fine when billing
 * is disabled or unconfigured (single-tenant / self-host deployments).
 */
import Stripe from 'stripe';
import db = require('../config/database');
import config = require('../config');
import logger = require('../utils/logger');
import { AppError } from '../utils/errors';
import {
  tenantService,
  SubscriptionStatus,
  TenantRow
} from './tenant.service';

const pool = db.pool;

export interface RecordUsageInput {
  tenantId: string;
  userId?: string | null;
  projectId?: string | null;
  kind?: 'tokens' | 'agent_run' | 'api_call';
  quantity?: number;
  model?: string | null;
  /** Our raw provider cost, in USD. */
  unitCostUsd?: number;
  /** Optional explicit billed amount; defaults to unitCostUsd * markup. */
  billedCostUsd?: number;
  metadata?: Record<string, unknown>;
}

export interface UsageSummary {
  tenantId: string;
  since: string;
  totalQuantity: number;
  totalCostUsd: number;
  totalBilledUsd: number;
  byModel: Array<{ model: string; quantity: number; billedUsd: number }>;
}

export interface MeteredUsageReport {
  tenantsReported: number;
  recordsReported: number;
  totalQuantity: number;
  skipped: Array<{ tenantId: string; reason: string }>;
  dryRun: boolean;
}

/** Default markup applied to raw provider cost when a billed amount is omitted. */
const DEFAULT_USAGE_MARKUP = 1.3;

class BillingService {
  private stripeClient: Stripe | null = null;

  /** True when a Stripe secret key is configured. */
  get isEnabled(): boolean {
    return Boolean(config.billing?.enabled && config.billing?.stripeSecretKey);
  }

  /** Lazily-constructed Stripe client; throws (502) if billing is unconfigured. */
  private get stripe(): Stripe {
    if (!this.isEnabled) {
      throw new AppError('Billing is not configured on this deployment', 502);
    }
    if (!this.stripeClient) {
      this.stripeClient = new Stripe(config.billing.stripeSecretKey, {
        // Pin so Stripe API drift can't silently change response shapes.
        apiVersion: '2025-09-30.clover' as Stripe.LatestApiVersion,
        maxNetworkRetries: 2,
        timeout: 20000
      });
    }
    return this.stripeClient;
  }

  // ========================================
  // Customer provisioning
  // ========================================

  /** Ensure the tenant has a Stripe customer, creating one on first use. */
  async ensureCustomer(tenantId: string): Promise<string> {
    const tenant = await tenantService.getTenantById(tenantId);
    if (!tenant) throw new AppError('Tenant not found', 404);
    if (tenant.stripe_customer_id) return tenant.stripe_customer_id;

    const customer = await this.stripe.customers.create({
      name: tenant.name,
      metadata: { tenantId: tenant.id, slug: tenant.slug }
    });

    await pool.query(
      'UPDATE tenants SET stripe_customer_id = $2 WHERE id = $1',
      [tenantId, customer.id]
    );
    return customer.id;
  }

  // ========================================
  // Checkout & portal
  // ========================================

  /**
   * Create a Stripe Checkout session for a plan. The plan key is mapped to a
   * Stripe Price via config.billing.priceMap.
   */
  async createCheckoutSession(
    tenantId: string,
    plan: string
  ): Promise<{ url: string; sessionId: string }> {
    const priceId = config.billing.priceMap?.[plan];
    if (!priceId) {
      throw new AppError(`No Stripe price configured for plan '${plan}'`, 400);
    }

    const customerId = await this.ensureCustomer(tenantId);
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: config.billing.checkoutSuccessUrl,
      cancel_url: config.billing.checkoutCancelUrl,
      client_reference_id: tenantId,
      subscription_data: { metadata: { tenantId, plan } },
      metadata: { tenantId, plan }
    });

    if (!session.url) {
      throw new AppError('Stripe did not return a checkout URL', 502);
    }
    return { url: session.url, sessionId: session.id };
  }

  /** Create a Billing Portal session so a tenant can self-manage billing. */
  async createPortalSession(tenantId: string): Promise<{ url: string }> {
    const customerId = await this.ensureCustomer(tenantId);
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: config.billing.portalReturnUrl
    });
    return { url: session.url };
  }

  // ========================================
  // Webhooks
  // ========================================

  /** Verify a webhook signature and construct the event. */
  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (!config.billing?.webhookSecret) {
      throw new AppError('Stripe webhook secret is not configured', 502);
    }
    try {
      return this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        config.billing.webhookSecret
      );
    } catch (err) {
      throw new AppError(
        `Webhook signature verification failed: ${(err as Error).message}`,
        400
      );
    }
  }

  /**
   * Process a verified webhook event. Idempotent: the event id is recorded in
   * billing_events and re-delivery is a no-op.
   * @returns true if newly processed, false if already seen.
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<boolean> {
    const seen = await pool.query(
      'SELECT id FROM billing_events WHERE id = $1',
      [event.id]
    );
    if ((seen.rowCount ?? 0) > 0) {
      logger.info(`billing: event ${event.id} already processed, skipping`);
      return false;
    }

    let tenantId: string | null = null;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        tenantId = (session.metadata?.['tenantId'] as string)
          || (session.client_reference_id ?? null);
        if (tenantId && session.subscription) {
          await pool.query(
            'UPDATE tenants SET stripe_subscription_id = $2 WHERE id = $1',
            [tenantId, String(session.subscription)]
          );
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        tenantId = (sub.metadata?.['tenantId'] as string) || null;
        if (!tenantId) {
          tenantId = await this.tenantIdForCustomer(String(sub.customer));
        }
        if (tenantId) {
          await this.syncSubscription(tenantId, sub);
        }
        break;
      }
      default:
        logger.info(`billing: unhandled event type ${event.type}`);
    }

    await pool.query(
      `INSERT INTO billing_events (id, type, tenant_id, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [event.id, event.type, tenantId, JSON.stringify(event.data.object)]
    );
    return true;
  }

  /** Map a Stripe subscription onto the tenant's subscription fields. */
  private async syncSubscription(
    tenantId: string,
    sub: Stripe.Subscription
  ): Promise<void> {
    const status = this.mapStripeStatus(sub.status);
    const plan = (sub.metadata?.['plan'] as string)
      || sub.items.data[0]?.price?.lookup_key
      || undefined;
    const periodStart = sub.start_date
      ? new Date(sub.start_date * 1000).toISOString()
      : null;
    const item = sub.items.data[0] as (Stripe.SubscriptionItem & {
      current_period_end?: number;
    }) | undefined;
    const periodEnd = item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null;

    await tenantService.updateSubscription(tenantId, {
      plan,
      status,
      periodStart,
      periodEnd
    });
    await pool.query(
      'UPDATE tenants SET stripe_subscription_id = $2 WHERE id = $1',
      [tenantId, sub.id]
    );
    logger.info(`billing: tenant ${tenantId} subscription → ${status} (${plan ?? 'plan unchanged'})`);
  }

  /** Translate a Stripe subscription status into our internal enum. */
  mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    switch (stripeStatus) {
      case 'trialing':
        return 'trialing';
      case 'active':
        return 'active';
      case 'past_due':
      case 'unpaid':
        return 'past_due';
      case 'canceled':
      case 'incomplete_expired':
        return 'canceled';
      case 'incomplete':
      case 'paused':
      default:
        return 'suspended';
    }
  }

  private async tenantIdForCustomer(customerId: string): Promise<string | null> {
    const res = await pool.query(
      'SELECT id FROM tenants WHERE stripe_customer_id = $1',
      [customerId]
    );
    return (res.rows[0]?.id as string | undefined) ?? null;
  }

  // ========================================
  // Metered usage
  // ========================================

  /** Record a unit of billable usage. Safe to call whether or not billing is on. */
  async recordUsage(input: RecordUsageInput): Promise<void> {
    const {
      tenantId,
      userId = null,
      projectId = null,
      kind = 'tokens',
      quantity = 0,
      model = null,
      unitCostUsd = 0,
      metadata = {}
    } = input;

    const billedCostUsd = input.billedCostUsd ?? unitCostUsd * DEFAULT_USAGE_MARKUP;

    await pool.query(
      `INSERT INTO usage_records
         (tenant_id, user_id, project_id, kind, quantity, model,
          unit_cost_usd, billed_cost_usd, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        tenantId,
        userId,
        projectId,
        kind,
        quantity,
        model,
        unitCostUsd,
        billedCostUsd,
        JSON.stringify(metadata)
      ]
    );
  }

  /** Aggregate usage for a tenant since a given date (default: 30 days). */
  async getUsageSummary(
    tenantId: string,
    since?: string
  ): Promise<UsageSummary> {
    const sinceDate = since
      ? new Date(since)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const totals = await pool.query(
      `SELECT COALESCE(SUM(quantity),0)::float8 AS qty,
              COALESCE(SUM(unit_cost_usd),0)::float8 AS cost,
              COALESCE(SUM(billed_cost_usd),0)::float8 AS billed
       FROM usage_records
       WHERE tenant_id = $1 AND created_at >= $2`,
      [tenantId, sinceDate]
    );
    const byModel = await pool.query(
      `SELECT COALESCE(model,'unknown') AS model,
              COALESCE(SUM(quantity),0)::float8 AS qty,
              COALESCE(SUM(billed_cost_usd),0)::float8 AS billed
       FROM usage_records
       WHERE tenant_id = $1 AND created_at >= $2
       GROUP BY model
       ORDER BY billed DESC`,
      [tenantId, sinceDate]
    );

    return {
      tenantId,
      since: sinceDate.toISOString(),
      totalQuantity: totals.rows[0]?.qty ?? 0,
      totalCostUsd: totals.rows[0]?.cost ?? 0,
      totalBilledUsd: totals.rows[0]?.billed ?? 0,
      byModel: byModel.rows.map((r) => ({
        model: r.model as string,
        quantity: r.qty as number,
        billedUsd: r.billed as number
      }))
    };
  }

  // ========================================
  // Metered usage → Stripe (usage-based billing)
  // ========================================

  /**
   * Aggregate unreported usage per tenant and push it to Stripe as meter
   * events, then mark exactly the records that were reported.
   *
   * Correctness/idempotency:
   * - Each tenant's quantity AND the record ids come from the SAME snapshot, so
   *   usage inserted mid-run rolls over to the next cycle (never double-counted).
   * - A failed Stripe push leaves that tenant's records unreported → retried
   *   next run. Records are only marked after a successful push.
   *
   * @param opts.dryRun compute the report without calling Stripe or marking rows
   */
  async reportMeteredUsage(opts: { dryRun?: boolean } = {}): Promise<MeteredUsageReport> {
    const dryRun = Boolean(opts.dryRun);
    const report: MeteredUsageReport = {
      tenantsReported: 0,
      recordsReported: 0,
      totalQuantity: 0,
      skipped: [],
      dryRun
    };

    if (!this.isEnabled) {
      report.skipped.push({ tenantId: '*', reason: 'billing disabled' });
      return report;
    }

    // Enumerate tenants that have unreported usage, with their Stripe customer.
    const tenants = await pool.query(
      `SELECT ur.tenant_id, t.stripe_customer_id
       FROM usage_records ur
       JOIN tenants t ON t.id = ur.tenant_id
       WHERE ur.reported_to_stripe = FALSE
       GROUP BY ur.tenant_id, t.stripe_customer_id`
    );

    for (const row of tenants.rows) {
      const tenantId = row.tenant_id as string;
      const customerId = row.stripe_customer_id as string | null;

      if (!customerId) {
        report.skipped.push({ tenantId, reason: 'no stripe_customer_id' });
        continue;
      }

      // Single snapshot: ids + quantity are consistent with each other.
      const snapshot = await pool.query(
        `SELECT id, quantity FROM usage_records
         WHERE tenant_id = $1 AND reported_to_stripe = FALSE`,
        [tenantId]
      );
      const ids = snapshot.rows.map((r) => r.id as string);
      const qty = snapshot.rows.reduce((sum, r) => sum + Number(r.quantity), 0);

      if (ids.length === 0 || qty <= 0) {
        report.skipped.push({ tenantId, reason: 'zero reportable quantity' });
        continue;
      }

      if (!dryRun) {
        try {
          await this.pushMeterEvent(customerId, qty);
        } catch (err) {
          report.skipped.push({
            tenantId,
            reason: `stripe push failed: ${(err as Error).message}`
          });
          continue; // leave unreported for the next run
        }
        await pool.query(
          'UPDATE usage_records SET reported_to_stripe = TRUE WHERE id = ANY($1)',
          [ids]
        );
      }

      report.tenantsReported += 1;
      report.recordsReported += ids.length;
      report.totalQuantity += qty;
    }

    logger.info(
      `billing: metered usage report — ${report.tenantsReported} tenant(s), `
      + `${report.recordsReported} record(s), qty ${report.totalQuantity}`
      + `${dryRun ? ' (dry-run)' : ''}`
      + (report.skipped.length ? `, ${report.skipped.length} skipped` : '')
    );
    return report;
  }

  /**
   * Emit one Stripe Billing Meter Event for a customer's aggregated usage.
   * Isolated so the exact Stripe API surface is easy to confirm/adjust against
   * your account's meter configuration (`STRIPE_METER_EVENT_NAME`).
   */
  private async pushMeterEvent(customerId: string, value: number): Promise<void> {
    const eventName = config.billing.meterEventName;
    if (!eventName) {
      throw new AppError(
        'STRIPE_METER_EVENT_NAME is not configured (required for metered usage)',
        502
      );
    }
    // Stripe Billing Meter Events API (usage-based billing). `as any` because
    // the billing.meterEvents surface is namespaced and version-sensitive.
    await (this.stripe as unknown as {
      billing: { meterEvents: { create: (p: unknown) => Promise<unknown> } };
    }).billing.meterEvents.create({
      event_name: eventName,
      payload: {
        stripe_customer_id: customerId,
        value: String(Math.round(value))
      },
      timestamp: Math.floor(Date.now() / 1000)
    });
  }
}

export const billingService = new BillingService();

/**
 * Start the background reporter that periodically pushes metered usage to
 * Stripe. No-op unless billing is enabled. Returns the interval handle (or null)
 * so callers can clear it on shutdown.
 */
export function startMeteredUsageReporter(
  intervalMs: number = config.billing.meterReportIntervalMs
): ReturnType<typeof setInterval> | null {
  if (!billingService.isEnabled || !config.billing.meterEventName) return null;
  const handle = setInterval(() => {
    billingService.reportMeteredUsage().catch((err) => {
      logger.error(`billing: metered usage report failed: ${(err as Error).message}`);
    });
  }, intervalMs);
  if (typeof handle.unref === 'function') handle.unref();
  logger.info(`billing: metered usage reporter started (every ${intervalMs}ms)`);
  return handle;
}
export type { TenantRow };
