-- =====================================================
-- Migration: 010 - Stripe Billing & Tenant Data Isolation
-- =====================================================
-- Description:
--   1. Billing: links tenants to Stripe (customer/subscription ids) and adds
--      per-tenant metered usage recording (usage_records) plus idempotent
--      webhook bookkeeping (billing_events).
--   2. Tenant data isolation: extends the tenant_id scoping that already
--      existed on projects (migration 008/009) to conversations and sources,
--      so a second tenant's data can never leak across tenants.
--
--   Idempotent and conditional — safe on every schema lineage.
-- Author: Zekka Framework Team
-- Date: 2026-10-10
-- Dependencies: 009_fresh_deployment_baseline.sql
-- =====================================================

BEGIN;

-- =====================================================
-- Billing: Stripe linkage on tenants
-- =====================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_stripe_customer
    ON tenants(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_stripe_subscription
    ON tenants(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- =====================================================
-- Billing: metered usage records
-- =====================================================
-- One row per billable unit of work (e.g. an agent run or a batch of tokens).
-- `reported_to_stripe` lets a background job push aggregated usage upward
-- without double-counting.
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(64),
    project_id VARCHAR(255),
    kind VARCHAR(50) NOT NULL DEFAULT 'tokens', -- 'tokens' | 'agent_run' | 'api_call'
    quantity NUMERIC(18,4) NOT NULL DEFAULT 0,   -- e.g. token count
    model VARCHAR(100),
    unit_cost_usd NUMERIC(18,6) NOT NULL DEFAULT 0, -- our cost
    billed_cost_usd NUMERIC(18,6) NOT NULL DEFAULT 0, -- what we charge (markup)
    metadata JSONB DEFAULT '{}',
    reported_to_stripe BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_records_tenant ON usage_records(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_records_unreported
    ON usage_records(tenant_id) WHERE reported_to_stripe = FALSE;

-- =====================================================
-- Billing: webhook event ledger (idempotency)
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_events (
    id VARCHAR(255) PRIMARY KEY, -- Stripe event id (evt_...)
    type VARCHAR(100) NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    payload JSONB,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(type);

-- =====================================================
-- Tenant data isolation: conversations & sources
-- =====================================================
ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id
    ON conversations(tenant_id) WHERE tenant_id IS NOT NULL;

ALTER TABLE sources
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sources_tenant_id
    ON sources(tenant_id) WHERE tenant_id IS NOT NULL;

-- Backfill tenant_id from the owning project where that linkage exists, so
-- existing rows become tenant-scoped the moment a project is assigned a tenant.
UPDATE conversations c
    SET tenant_id = p.tenant_id
    FROM projects p
    WHERE c.project_id = p.id
      AND c.tenant_id IS NULL
      AND p.tenant_id IS NOT NULL;

UPDATE sources s
    SET tenant_id = p.tenant_id
    FROM projects p
    WHERE s.project_id = p.id
      AND s.tenant_id IS NULL
      AND p.tenant_id IS NOT NULL;

COMMIT;
