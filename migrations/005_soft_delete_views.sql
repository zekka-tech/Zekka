-- =====================================================
-- Migration: 005 - Soft-Delete Enforcement Views
-- =====================================================
-- Description: Creates views for each soft-deletable table that
--              automatically filter out deleted_at IS NOT NULL rows.
--              Application code should query these views instead of
--              the base tables to guarantee isolation by default.
-- Author: Zekka Framework Team
-- Date: 2026-04-06
-- Dependencies: 004_create_project_tables.sql
-- =====================================================

BEGIN;

-- ─── projects ──────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS active_projects CASCADE;
CREATE VIEW active_projects AS
  SELECT * FROM projects WHERE deleted_at IS NULL;

COMMENT ON VIEW active_projects IS
  'Projects that have not been soft-deleted. Use this in all queries instead of the projects table.';

-- ─── conversations ─────────────────────────────────────────────────────────

DROP VIEW IF EXISTS active_conversations CASCADE;
CREATE VIEW active_conversations AS
  SELECT * FROM conversations WHERE deleted_at IS NULL;

COMMENT ON VIEW active_conversations IS
  'Conversations that have not been soft-deleted.';

-- ─── messages ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    EXECUTE '
      DROP VIEW IF EXISTS active_messages CASCADE;
      CREATE VIEW active_messages AS SELECT * FROM messages WHERE deleted_at IS NULL;
    ';
  END IF;
END $$;

-- ─── sources ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sources') THEN
    EXECUTE '
      DROP VIEW IF EXISTS active_sources CASCADE;
      CREATE VIEW active_sources AS SELECT * FROM sources WHERE deleted_at IS NULL;
    ';
  END IF;
END $$;

-- ─── agents ────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
    EXECUTE '
      DROP VIEW IF EXISTS active_agents CASCADE;
      CREATE VIEW active_agents AS SELECT * FROM agents WHERE deleted_at IS NULL;
    ';
  END IF;
END $$;

-- ─── Row-level security (optional, requires superuser) ─────────────────────
-- Uncomment to enforce soft-delete at the database level (RLS).
-- Requires ENABLE ROW LEVEL SECURITY on each table.
--
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY soft_delete_policy ON projects
--   USING (deleted_at IS NULL);

COMMIT;
