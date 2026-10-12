# Billing Setup (Stripe)

Zekka's SaaS billing is **off by default**. The code is fully wired
(`src/services/billing.service.ts`, `/api/v1/billing`, webhook at
`/webhooks/stripe`); this guide is the one-time setup to turn it on. You supply
the secrets — they come from your Stripe account and are never committed to git.

## 1. Stripe dashboard

1. **API keys** — https://dashboard.stripe.com/apikeys
   - Dev: use the `sk_test_...` secret key.
   - Prod: use the `sk_live_...` secret key.
2. **Products & Prices** — create one Product per plan with a **recurring
   Price**, then copy each `price_...` id. These map to your internal plan keys
   (the `plan` sent to `POST /api/v1/billing/:tenantId/checkout`).
3. **Webhook endpoint** — https://dashboard.stripe.com/webhooks → add endpoint
   `https://<APP_URL>/webhooks/stripe`, subscribe to at least:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

   Copy the endpoint's **signing secret** (`whsec_...`).

## 2. Environment variables

| Var | Required | Notes |
|-----|----------|-------|
| `BILLING_ENABLED` | yes | set `true` to enable the endpoints |
| `STRIPE_SECRET_KEY` | when enabled | `sk_test_...` / `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | when enabled | `whsec_...` from the webhook endpoint |
| `STRIPE_PRICE_MAP` | to sell plans | JSON: `{"pro":"price_123","business":"price_456"}` |
| `APP_URL` | recommended | public base URL for Checkout/Portal redirects |
| `STRIPE_METERED_USAGE_PRICE_ID` | optional | for usage-based metered billing |
| `BILLING_PORTAL_RETURN_URL` / `BILLING_CHECKOUT_SUCCESS_URL` / `BILLING_CHECKOUT_CANCEL_URL` | optional | default to `APP_URL` + `/settings/billing` paths |

When `BILLING_ENABLED=true`, the app **fails fast at boot** if
`STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` is missing, and rejects a
malformed `STRIPE_PRICE_MAP`. Startup logs print `Billing: Enabled (…)` so you
can confirm config without exposing secrets.

### Where to set them
- **Local / single host**: `.env` or `.env.production` (see `.env.example`).
- **Docker Compose (prod)**: values flow from `.env.production` and the explicit
  passthrough block in `docker-compose.prod.yml`.
- **Kubernetes**: non-secret config (`BILLING_ENABLED`, `STRIPE_PRICE_MAP`,
  `STRIPE_METERED_USAGE_PRICE_ID`, `APP_URL`) lives in the `zekka-config`
  ConfigMap; `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` go in the
  `zekka-secrets` Secret (see the `kubectl create secret` block in
  `k8s/deployment.yaml`). Both are injected via `envFrom`.

## 3. Local development with the Stripe CLI

```bash
# forward Stripe events to the local webhook and print a whsec_ to use
stripe listen --forward-to localhost:3000/webhooks/stripe
```

Set `STRIPE_WEBHOOK_SECRET` to the `whsec_...` the command prints.

## 4. Verify end-to-end

```bash
# (authenticated as a tenant owner; X-Tenant-Id resolved from the path)
curl -X POST https://<APP_URL>/api/v1/billing/<tenantId>/checkout \
     -H 'Authorization: Bearer <jwt>' -H 'Content-Type: application/json' \
     -d '{"plan":"pro"}'
# → { "url": "https://checkout.stripe.com/...", "sessionId": "cs_..." }
```

Complete the Checkout in the returned URL. Stripe fires
`checkout.session.completed` + `customer.subscription.created` → the webhook
syncs the tenant's `subscription_status` / `plan`. Then:

- `POST /api/v1/billing/<tenantId>/portal` → Billing Portal URL (owner).
- `GET  /api/v1/billing/<tenantId>/usage`  → metered usage summary (admin+).

## Notes

- Webhook idempotency is enforced via the `billing_events` ledger — Stripe
  re-deliveries are no-ops.
- Metered usage is recorded in `usage_records` with both your provider cost and
  the marked-up billed amount (the multi-model cost-routing margin). A job to
  push aggregated usage to Stripe metered prices is not yet implemented.
- To roll back: set `BILLING_ENABLED=false` — the endpoints return 503 and the
  rest of the app is unaffected.
