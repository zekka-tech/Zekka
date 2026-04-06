-- =====================================================
-- Rollback: 004_create_project_tables.sql
-- =====================================================
-- Drops all objects created in migration 004 in reverse dependency order.

BEGIN;

-- Triggers
DROP TRIGGER IF EXISTS update_project_files_updated_at ON project_files;
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;

-- Tables (reverse creation order)
DROP TABLE IF EXISTS project_activity_logs CASCADE;
DROP TABLE IF EXISTS project_files CASCADE;
DROP TABLE IF EXISTS message_reactions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

COMMIT;
