-- =====================================================
-- Rollback: 006_composite_indexes.sql
-- =====================================================
-- Drops all composite/partial indexes created in migration 006.
-- Note: CONCURRENTLY cannot be used inside a transaction block.

DROP INDEX CONCURRENTLY IF EXISTS idx_projects_owner_active_updated;
DROP INDEX CONCURRENTLY IF EXISTS idx_projects_active_updated;
DROP INDEX CONCURRENTLY IF EXISTS idx_project_members_user_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_conversations_project_active_updated;
DROP INDEX CONCURRENTLY IF EXISTS idx_conversations_user_active_updated;
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_conversation_active_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_activity_logs_project_user_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_sources_project_active_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_agents_project_active_created;
