-- =====================================================
-- Migration: 008 - Multi-Tenancy Foundation
-- =====================================================
-- Description: Tenant (organization) model with per-tenant RBAC and
--              subscription management, plus tenant scoping for projects.
--              Enables the SaaS/multi-tenant offering identified as a gap
--              in docs/ZEKKA_ANALYSIS.md.
-- Author: Zekka Framework Team
-- Date: 2026-07-19
-- Dependencies: 004_create_project_tables.sql
-- =====================================================

BEGIN;

-- =====================================================
-- Tenants Table
-- =====================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE, -- URL-safe identifier, e.g. 'acme-corp'

    -- Subscription management
    plan VARCHAR(50) NOT NULL DEFAULT 'free', -- 'free', 'starter', 'pro', 'enterprise'
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'suspended')),
    subscription_period_start TIMESTAMP WITH TIME ZONE,
    subscription_period_end TIMESTAMP WITH TIME ZONE,
    seat_limit INTEGER NOT NULL DEFAULT 5 CHECK (seat_limit > 0),

    -- Extensibility
    metadata JSONB DEFAULT '{}',

    -- Lifecycle
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);

-- =====================================================
-- Tenant Members Table (per-tenant RBAC)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role within the tenant
    role VARCHAR(50) NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'admin', 'member', 'viewer')),

    invited_by UUID REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_active
    ON tenant_members(tenant_id, user_id) WHERE is_active = TRUE;

-- =====================================================
-- Tenant scoping for projects
-- =====================================================
-- Nullable so existing single-tenant deployments keep working; the
-- application scopes queries by tenant_id whenever tenant context is present.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id) WHERE tenant_id IS NOT NULL;

-- =====================================================
-- updated_at triggers (function defined in 001_initial_schema.sql)
-- =====================================================
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_members_updated_at ON tenant_members;
CREATE TRIGGER update_tenant_members_updated_at
    BEFORE UPDATE ON tenant_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
