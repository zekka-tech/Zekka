-- =====================================================
-- Rollback: 003_create_user_tables.sql
-- =====================================================
-- Drops all objects created in migration 003 in reverse dependency order.

BEGIN;

-- Views
DROP VIEW IF EXISTS v_active_sessions;
DROP VIEW IF EXISTS v_users_with_roles;

-- Triggers
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
DROP TRIGGER IF EXISTS update_oauth_connections_updated_at ON oauth_connections;
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Tables (reverse creation order, respecting FKs)
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS oauth_connections CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS user_role_assignments CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS email_verification_tokens CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Function (shared with 001 — only drop if 001 was already rolled back)
DROP FUNCTION IF EXISTS update_updated_at_column();

COMMIT;
