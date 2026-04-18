-- =====================================================
-- Rollback: 007_email_case_insensitive_unique.sql
-- =====================================================

DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_lower;
