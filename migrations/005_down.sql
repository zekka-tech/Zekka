-- =====================================================
-- Rollback: 005_soft_delete_views.sql
-- =====================================================
-- Drops all views created in migration 005.

BEGIN;

DROP VIEW IF EXISTS active_messages CASCADE;
DROP VIEW IF EXISTS active_conversations CASCADE;
DROP VIEW IF EXISTS active_projects CASCADE;
DROP VIEW IF EXISTS active_sources CASCADE;
DROP VIEW IF EXISTS active_agents CASCADE;

COMMIT;
