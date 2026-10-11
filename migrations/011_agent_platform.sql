-- =====================================================
-- Migration: 011 - Agent Platform (Registry, Runs, Memory)
-- =====================================================
-- Description:
--   1. agent_definitions  - pluggable, versioned agent registry. Built-in
--      agents are seeded from code (is_builtin = TRUE, tenant_id NULL);
--      tenants may register their own custom agents (tenant_id set).
--   2. agent_runs         - durable, resumable record of an agent loop run,
--      with status + cost + step counters for the live run inspector.
--   3. agent_run_events   - per-step event stream for a run (plan/act/observe),
--      the backing store for the streamed timeline.
--   4. agent_memory       - retrieval-backed cross-run memory, scoped by
--      tenant/user/agent.
--
--   Idempotent and conditional — safe on every schema lineage.
-- Author: Zekka Framework Team
-- Date: 2026-10-10
-- Dependencies: 010_billing_and_tenant_scoping.sql
-- =====================================================

BEGIN;

-- =====================================================
-- Pluggable agent registry
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_key VARCHAR(100) NOT NULL,       -- stable identifier, e.g. 'devin'
    version INTEGER NOT NULL DEFAULT 1,     -- monotonically increasing per key
    name VARCHAR(255) NOT NULL,
    tier INTEGER NOT NULL DEFAULT 2,
    description TEXT,
    capabilities JSONB NOT NULL DEFAULT '[]',
    system_prompt TEXT,
    tools JSONB NOT NULL DEFAULT '[]',      -- tool names this agent may use
    model VARCHAR(100),                      -- preferred model (optional)
    is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = global
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- One row per (key, version) within a scope (global vs a given tenant).
-- COALESCE keeps the global scope (tenant_id NULL) unique too.
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_definitions_key_version
    ON agent_definitions(agent_key, version, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_agent_definitions_active
    ON agent_definitions(agent_key) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_agent_definitions_tenant
    ON agent_definitions(tenant_id) WHERE tenant_id IS NOT NULL;

-- =====================================================
-- Durable / resumable agent runs
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(255),
    project_id VARCHAR(255),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    agent_key VARCHAR(100),
    agent_name VARCHAR(255),
    goal TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'running'
        CHECK (status IN ('running','completed','failed','budget_exhausted','max_steps','no_progress','cancelled')),
    reason TEXT,
    steps INTEGER NOT NULL DEFAULT 0,
    files_written JSONB NOT NULL DEFAULT '[]',
    cost_usd NUMERIC(18,6) NOT NULL DEFAULT 0,
    result JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_project ON agent_runs(project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_tenant ON agent_runs(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);

-- =====================================================
-- Per-step run event stream (live run inspector)
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_run_events (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    step INTEGER NOT NULL DEFAULT 0,
    type VARCHAR(30) NOT NULL, -- 'plan' | 'act' | 'observe' | 'terminal' | 'error'
    tool VARCHAR(100),
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_run_events_run ON agent_run_events(run_id, id);

-- =====================================================
-- Cross-run agent memory (retrieval-backed)
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(64),
    agent_key VARCHAR(100),
    project_id VARCHAR(255),
    kind VARCHAR(30) NOT NULL DEFAULT 'fact', -- 'fact' | 'summary' | 'preference'
    content TEXT NOT NULL,
    importance INTEGER NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_scope
    ON agent_memory(tenant_id, user_id, agent_key);
-- Trigram-ish fallback: a simple text search index for retrieval by content.
CREATE INDEX IF NOT EXISTS idx_agent_memory_content
    ON agent_memory USING gin(to_tsvector('english', content));

COMMIT;
