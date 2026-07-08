-- =====================================================
-- Rollback: 001_initial_schema.sql
-- =====================================================
-- Drops all objects created in migration 001 in reverse dependency order.

-- Triggers
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Functions
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Role assignment data (CASCADE handles FK rows)

-- Tables (reverse creation order, respecting FKs)
DROP TABLE IF EXISTS audit_log_basic CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
