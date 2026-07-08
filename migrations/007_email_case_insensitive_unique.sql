-- =====================================================
-- Migration: 007 - Case-insensitive email uniqueness
-- =====================================================
-- Description: Enforce that emails are unique regardless of case.
--              user@x.com and USER@X.COM would otherwise create two
--              separate accounts. Implements C5 from the production
--              readiness audit.
-- Author: Zekka Framework Team
-- Date: 2026-04-06
-- Dependencies: 003_create_user_tables.sql
-- =====================================================

BEGIN;

-- Create a unique functional index on LOWER(email) so that duplicate
-- registrations differing only in case are rejected at the DB layer.
-- The existing idx_users_email index (on the raw column) is kept for
-- fast equality lookups from the application (which always lower-cases
-- email before querying).
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower
  ON users (LOWER(email))
  WHERE deleted_at IS NULL;

COMMIT;
