-- =====================================================
-- Rollback: 002_session2_security_enhancements.sql
-- =====================================================
-- Drops all objects created in migration 002 in reverse dependency order.

-- Views
DROP VIEW IF EXISTS v_expiring_passwords;
DROP VIEW IF EXISTS v_failed_login_attempts;
DROP VIEW IF EXISTS v_active_security_threats;

-- Functions
DROP FUNCTION IF EXISTS delete_archived_audit_logs();
DROP FUNCTION IF EXISTS archive_old_audit_logs();

-- Tables (reverse creation order)
DROP TABLE IF EXISTS security_alerts CASCADE;
DROP TABLE IF EXISTS security_alert_rules CASCADE;
DROP TABLE IF EXISTS security_events CASCADE;
DROP TABLE IF EXISTS password_policies CASCADE;
DROP TABLE IF EXISTS password_history CASCADE;
DROP TABLE IF EXISTS mfa_auth_logs CASCADE;
DROP TABLE IF EXISTS mfa_devices CASCADE;
DROP TABLE IF EXISTS encryption_keys CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;

-- Columns added to users table by migration 002
-- (Only drop if the column exists and was not originally part of 001)
ALTER TABLE users DROP COLUMN IF EXISTS password_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS require_password_change;
