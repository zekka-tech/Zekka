-- =====================================================
-- Rollback: 009_fresh_deployment_baseline.sql
-- =====================================================
-- Drops only the tables 009 introduced that did not exist in any prior
-- lineage (agent_activities, token_usage). Everything else in 009 is a
-- reconciliation of tables owned by earlier lineages (init-db.sql,
-- create-minimal-schema.sql, runtime DDL) and is deliberately NOT dropped:
-- reversing renames or re-breaking column types would destroy live data.

BEGIN;

DROP TABLE IF EXISTS agent_activities;
DROP TABLE IF EXISTS token_usage;

COMMIT;
