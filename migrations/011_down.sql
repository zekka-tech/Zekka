-- =====================================================
-- Rollback: 011 - Agent Platform
-- =====================================================
BEGIN;

DROP TABLE IF EXISTS agent_memory;
DROP TABLE IF EXISTS agent_run_events;
DROP TABLE IF EXISTS agent_runs;
DROP TABLE IF EXISTS agent_definitions;

COMMIT;
