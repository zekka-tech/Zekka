/**
 * Billing Service Unit Tests
 *
 * Covers customer provisioning, checkout/portal sessions, webhook idempotency
 * + subscription sync, Stripe-status mapping, and metered usage recording.
 */

// --- Stripe SDK mock ---
const stripeMocks = {
  customers: { create: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  billingPortal: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() },
  billing: { meterEvents: { create: jest.fn() } }
};
jest.mock('stripe', () => jest.fn().mockImplementation(() => stripeMocks));

// --- config mock (billing enabled) ---
jest.mock('../../../src/config', () => ({
  billing: {
    enabled: true,
    stripeSecretKey: 'sk_test_123',
    webhookSecret: 'whsec_123',
    portalReturnUrl: 'https://app.test/billing',
    checkoutSuccessUrl: 'https://app.test/success',
    checkoutCancelUrl: 'https://app.test/cancel',
    priceMap: { pro: 'price_pro_123' },
    meteredUsagePriceId: null,
    meterEventName: 'zekka_tokens',
    meterReportIntervalMs: 3600000
  }
}));

// --- database mock ---
jest.mock('../../../src/config/database', () => ({
  pool: { query: jest.fn() }
}));

// --- tenant service mock ---
jest.mock('../../../src/services/tenant.service', () => {
  const actual = jest.requireActual('../../../src/services/tenant.service');
  return {
    ...actual,
    tenantService: {
      getTenantById: jest.fn(),
      updateSubscription: jest.fn()
    }
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('../../../src/config/database');
import { billingService } from '../../../src/services/billing.service';
import { tenantService } from '../../../src/services/tenant.service';

const poolQuery = db.pool.query as jest.Mock;
const mockTenant = tenantService as jest.Mocked<typeof tenantService>;

const TENANT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const tenantRow = {
  id: TENANT_ID,
  name: 'Acme',
  slug: 'acme',
  plan: 'free',
  subscription_status: 'trialing',
  seat_limit: 5,
  metadata: {},
  stripe_customer_id: null,
  stripe_subscription_id: null,
  is_active: true
};

beforeEach(() => {
  jest.clearAllMocks();
  poolQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('BillingService.isEnabled', () => {
  it('is true when a secret key is configured', () => {
    expect(billingService.isEnabled).toBe(true);
  });
});

describe('ensureCustomer', () => {
  it('creates a Stripe customer on first use and persists the id', async () => {
    mockTenant.getTenantById.mockResolvedValue({ ...tenantRow } as never);
    stripeMocks.customers.create.mockResolvedValue({ id: 'cus_123' });

    const id = await billingService.ensureCustomer(TENANT_ID);

    expect(id).toBe('cus_123');
    expect(stripeMocks.customers.create).toHaveBeenCalledTimes(1);
    expect(poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE tenants SET stripe_customer_id'),
      [TENANT_ID, 'cus_123']
    );
  });

  it('reuses an existing customer id', async () => {
    mockTenant.getTenantById.mockResolvedValue({
      ...tenantRow,
      stripe_customer_id: 'cus_existing'
    } as never);

    const id = await billingService.ensureCustomer(TENANT_ID);

    expect(id).toBe('cus_existing');
    expect(stripeMocks.customers.create).not.toHaveBeenCalled();
  });
});

describe('createCheckoutSession', () => {
  it('maps the plan to a price and returns the checkout URL', async () => {
    mockTenant.getTenantById.mockResolvedValue({
      ...tenantRow,
      stripe_customer_id: 'cus_1'
    } as never);
    stripeMocks.checkout.sessions.create.mockResolvedValue({
      id: 'cs_1',
      url: 'https://checkout.stripe/cs_1'
    });

    const result = await billingService.createCheckoutSession(TENANT_ID, 'pro');

    expect(result.url).toContain('checkout.stripe');
    expect(stripeMocks.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_pro_123', quantity: 1 }],
        client_reference_id: TENANT_ID
      })
    );
  });

  it('rejects an unknown plan with 400', async () => {
    await expect(
      billingService.createCheckoutSession(TENANT_ID, 'nonexistent')
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('mapStripeStatus', () => {
  it.each([
    ['trialing', 'trialing'],
    ['active', 'active'],
    ['past_due', 'past_due'],
    ['unpaid', 'past_due'],
    ['canceled', 'canceled'],
    ['incomplete_expired', 'canceled'],
    ['paused', 'suspended'],
    ['incomplete', 'suspended']
  ])('maps %s → %s', (stripeStatus, expected) => {
    expect(billingService.mapStripeStatus(stripeStatus as never)).toBe(expected);
  });
});

describe('handleWebhookEvent', () => {
  it('is idempotent — a re-delivered event is skipped', async () => {
    poolQuery.mockResolvedValueOnce({ rows: [{ id: 'evt_1' }], rowCount: 1 });

    const processed = await billingService.handleWebhookEvent({
      id: 'evt_1',
      type: 'customer.subscription.updated',
      data: { object: {} }
    } as never);

    expect(processed).toBe(false);
  });

  it('syncs a subscription update onto the tenant', async () => {
    // first query: idempotency check → not seen
    poolQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockTenant.updateSubscription.mockResolvedValue({} as never);

    const event = {
      id: 'evt_2',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          status: 'active',
          customer: 'cus_1',
          start_date: 1700000000,
          metadata: { tenantId: TENANT_ID, plan: 'pro' },
          items: { data: [{ current_period_end: 1702000000, price: {} }] }
        }
      }
    };

    const processed = await billingService.handleWebhookEvent(event as never);

    expect(processed).toBe(true);
    expect(mockTenant.updateSubscription).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ status: 'active', plan: 'pro' })
    );
  });
});

describe('recordUsage', () => {
  it('applies the default markup when no billed amount is supplied', async () => {
    await billingService.recordUsage({
      tenantId: TENANT_ID,
      quantity: 1000,
      model: 'claude-opus-4-8',
      unitCostUsd: 0.1
    });

    const call = poolQuery.mock.calls.find((c: unknown[]) =>
      String(c[0]).includes('INSERT INTO usage_records'));
    expect(call).toBeDefined();
    const params = call![1] as number[];
    // billed = unitCost * 1.3
    expect(params[7]).toBeCloseTo(0.13);
  });
});

describe('getUsageSummary', () => {
  it('aggregates totals and per-model breakdown', async () => {
    poolQuery
      .mockResolvedValueOnce({ rows: [{ qty: 5000, cost: 0.5, billed: 0.65 }] })
      .mockResolvedValueOnce({
        rows: [{ model: 'claude-opus-4-8', qty: 5000, billed: 0.65 }]
      });

    const summary = await billingService.getUsageSummary(TENANT_ID);

    expect(summary.totalBilledUsd).toBe(0.65);
    expect(summary.byModel).toHaveLength(1);
    expect(summary.byModel[0]?.model).toBe('claude-opus-4-8');
  });
});

describe('reportMeteredUsage', () => {
  it('aggregates unreported usage per tenant, pushes a meter event, and marks reported', async () => {
    poolQuery
      // enumerate tenants with unreported usage + customer id
      .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT_ID, stripe_customer_id: 'cus_1' }] })
      // per-tenant snapshot (ids + quantities)
      .mockResolvedValueOnce({ rows: [{ id: 'u1', quantity: 1000 }, { id: 'u2', quantity: 500 }] })
      // UPDATE ... reported_to_stripe
      .mockResolvedValueOnce({ rowCount: 2 });
    stripeMocks.billing.meterEvents.create.mockResolvedValue({ id: 'mtr_1' });

    const report = await billingService.reportMeteredUsage();

    expect(report.tenantsReported).toBe(1);
    expect(report.recordsReported).toBe(2);
    expect(report.totalQuantity).toBe(1500);
    expect(stripeMocks.billing.meterEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'zekka_tokens',
        payload: expect.objectContaining({ stripe_customer_id: 'cus_1', value: '1500' })
      })
    );
    // the UPDATE marks exactly the snapshot ids
    const updateCall = poolQuery.mock.calls.find((c: unknown[]) =>
      String(c[0]).includes('reported_to_stripe = TRUE'));
    expect(updateCall![1]).toEqual([['u1', 'u2']]);
  });

  it('skips a tenant with no stripe_customer_id and never pushes', async () => {
    poolQuery.mockResolvedValueOnce({ rows: [{ tenant_id: TENANT_ID, stripe_customer_id: null }] });
    const report = await billingService.reportMeteredUsage();
    expect(report.tenantsReported).toBe(0);
    expect(report.skipped[0]).toMatchObject({ tenantId: TENANT_ID, reason: expect.stringMatching(/stripe_customer_id/) });
    expect(stripeMocks.billing.meterEvents.create).not.toHaveBeenCalled();
  });

  it('does NOT mark records when the Stripe push fails (retry-safe)', async () => {
    poolQuery
      .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT_ID, stripe_customer_id: 'cus_1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'u1', quantity: 10 }] });
    stripeMocks.billing.meterEvents.create.mockRejectedValue(new Error('stripe down'));

    const report = await billingService.reportMeteredUsage();

    expect(report.tenantsReported).toBe(0);
    expect(report.skipped[0]?.reason).toMatch(/stripe push failed/);
    const markedAnything = poolQuery.mock.calls.some((c: unknown[]) =>
      String(c[0]).includes('reported_to_stripe = TRUE'));
    expect(markedAnything).toBe(false);
  });

  it('dry-run computes totals without calling Stripe or marking rows', async () => {
    poolQuery
      .mockResolvedValueOnce({ rows: [{ tenant_id: TENANT_ID, stripe_customer_id: 'cus_1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'u1', quantity: 42 }] });

    const report = await billingService.reportMeteredUsage({ dryRun: true });

    expect(report.dryRun).toBe(true);
    expect(report.tenantsReported).toBe(1);
    expect(report.totalQuantity).toBe(42);
    expect(stripeMocks.billing.meterEvents.create).not.toHaveBeenCalled();
    const markedAnything = poolQuery.mock.calls.some((c: unknown[]) =>
      String(c[0]).includes('reported_to_stripe = TRUE'));
    expect(markedAnything).toBe(false);
  });
});
