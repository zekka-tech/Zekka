-- =====================================================
-- Migration: 006 - Composite Indexes for FK-Join Heavy Queries
-- =====================================================
-- Description: Add composite and partial indexes covering the most
--              expensive FK-join + soft-delete + ORDER BY patterns
--              identified in project.service.js, conversation.service.js,
--              and source.service.js.
-- Author: Zekka Framework Team
-- Date: 2026-04-06
-- Dependencies: 004_create_project_tables.sql
-- =====================================================

BEGIN;

-- ─── projects ────────────────────────────────────────────────────────────────

-- listProjects: WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC
-- Partial index avoids storing/scanning deleted rows.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_owner_active_updated
  ON projects (owner_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- Count query for project_members join: WHERE (owner_id = $1 OR pm.user_id = $1) AND deleted_at IS NULL
-- Covering index for the soft-delete + timestamp sort without the owner filter
-- (the owner_id arm is served by the index above; this covers the pure deleted_at filter).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_active_updated
  ON projects (updated_at DESC)
  WHERE deleted_at IS NULL;

-- ─── project_members ─────────────────────────────────────────────────────────

-- listProjects joins project_members to find projects a user is a member of.
-- Existing idx_project_members_user_id covers (user_id) alone.
-- This covers the full join condition: user_id + project_id + is_active.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_members_user_active
  ON project_members (user_id, project_id)
  WHERE is_active = TRUE;

-- ─── conversations ───────────────────────────────────────────────────────────

-- listConversations (project-scoped):
--   WHERE c.project_id = $2 AND c.deleted_at IS NULL ORDER BY c.updated_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_project_active_updated
  ON conversations (project_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- listConversations (user-scoped):
--   WHERE c.user_id = $1 AND c.deleted_at IS NULL ORDER BY c.updated_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_active_updated
  ON conversations (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- ─── messages ────────────────────────────────────────────────────────────────

-- getMessages (main list):
--   WHERE conversation_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC
-- Correlated subqueries in listConversations:
--   WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1
-- A single index on (conversation_id, created_at) satisfies both directions
-- because PostgreSQL can scan it backwards for the DESC variant.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_active_created
  ON messages (conversation_id, created_at)
  WHERE deleted_at IS NULL;

-- COUNT(*) subquery in listConversations:
--   SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL
-- The index above already covers this via an index-only scan.

-- ─── project_activity_logs ───────────────────────────────────────────────────

-- Common query: filter by project + optional user, order by time.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_project_user_created
  ON project_activity_logs (project_id, user_id, created_at DESC);

-- ─── sources (if table exists) ───────────────────────────────────────────────
-- source.service.js: WHERE project_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS is safe even if table does not exist
-- because the DO $$ block skips gracefully.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sources') THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_sources_project_active_created
        ON sources (project_id, created_at DESC)
        WHERE deleted_at IS NULL
    $idx$;
  END IF;
END
$$;

-- ─── agents (if table exists) ────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_agents_project_active_created
        ON agents (project_id, created_at DESC)
        WHERE deleted_at IS NULL
    $idx$;
  END IF;
END
$$;

COMMIT;
