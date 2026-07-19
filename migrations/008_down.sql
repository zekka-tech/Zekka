-- =====================================================
-- Rollback: 008_multi_tenancy.sql
-- =====================================================
-- Drops tenant tables and removes tenant scoping from projects.

BEGIN;

DROP INDEX IF EXISTS idx_projects_tenant_id;
ALTER TABLE projects DROP COLUMN IF EXISTS tenant_id;

DROP TABLE IF EXISTS tenant_members CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

COMMIT;
