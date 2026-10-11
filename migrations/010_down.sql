-- =====================================================
-- Rollback: 010 - Stripe Billing & Tenant Data Isolation
-- =====================================================
BEGIN;

DROP INDEX IF EXISTS idx_sources_tenant_id;
ALTER TABLE sources DROP COLUMN IF EXISTS tenant_id;

DROP INDEX IF EXISTS idx_conversations_tenant_id;
ALTER TABLE conversations DROP COLUMN IF EXISTS tenant_id;

DROP TABLE IF EXISTS billing_events;
DROP TABLE IF EXISTS usage_records;

DROP INDEX IF EXISTS idx_tenants_stripe_subscription;
DROP INDEX IF EXISTS idx_tenants_stripe_customer;
ALTER TABLE tenants DROP COLUMN IF EXISTS stripe_subscription_id;
ALTER TABLE tenants DROP COLUMN IF EXISTS stripe_customer_id;

COMMIT;
