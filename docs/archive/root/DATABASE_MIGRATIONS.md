# 📊 DATABASE MIGRATIONS GUIDE

**Project**: Zekka Framework v3.0.0  
**Last Updated**: 2026-01-15

---

## 📋 Available Migrations

| # | File | Description | Status |
|---|------|-------------|--------|
| 001 | `001_initial_schema.sql` | Initial database schema, RBAC, users, sessions, API keys | ✅ Ready |
| 002 | `002_session2_security_enhancements.sql` | Enhanced audit logging, MFA, encryption keys, password policies | ✅ Ready |

---

## 🚀 Quick Start

### 1. Prerequisites

```bash
# PostgreSQL 13+ installed and running
psql --version  # Should be 13.x or higher

# Database created
createdb zekka_production
# OR
psql -c "CREATE DATABASE zekka_production;"

# Environment variables configured
DATABASE_URL=postgresql://user:password@localhost:5432/zekka_production
```

### 2. Run All Migrations

```bash
# Option 1: Using npm script (recommended)
npm run migrate

# Option 2: Using CLI directly
node src/cli/migrate.js

# Option 3: Check status first
npm run migrate:status
npm run migrate
```

---

## 📚 Migration Details

### Migration 001: Initial Schema

**File**: `migrations/001_initial_schema.sql` (14KB)

**Creates**:
1. **Users Table** - User accounts with authentication
   - Email, username, password hash (bcrypt, 12 rounds)
   - Account status (active, verified, locked)
   - Security tracking (failed logins, last login IP)
   - Password management (reset tokens, expiration)
   
2. **Sessions Table** - Active user sessions
   - Session ID, user reference
   - IP address, user agent
   - Revocation tracking
   - Expiration handling
   
3. **Roles Table** - RBAC roles
   - Role hierarchy (0-100 levels)
   - System roles (cannot be deleted)
   - Default roles: superadmin, admin, moderator, user
   
4. **Permissions Table** - Fine-grained permissions
   - Resource-action based (e.g., users.create)
   - 10 default permissions
   
5. **Role Permissions** - Role-to-permission mapping
   - Many-to-many relationship
   - Default assignments
   
6. **User Roles** - User-to-role assignment
   - Many-to-many relationship
   - Optional expiration
   
7. **API Keys Table** - Programmatic access
   - Hashed storage (SHA-256)
   - Rate limiting
   - Usage tracking
   - Scope-based permissions
   
8. **Basic Audit Log** - Initial audit trail
   - User actions
   - Resource tracking
   - IP addresses

**Default Data**:
- 4 Roles: superadmin, admin, moderator, user
- 10 Permissions: users.*, roles.*, api_keys.*, audit.*, system.*
- Permission assignments for each role

---

### Migration 002: Session 2 Security Enhancements

**File**: `migrations/002_session2_security_enhancements.sql` (23KB)

**Creates**:
1. **Enhanced Audit Logs**
   - Comprehensive request/response tracking
   - Security context (suspicious flags, risk levels)
   - Geographic location
   - 90-day retention policies
   - Performance metrics
   
2. **Encryption Keys**
   - Key rotation tracking
   - Multiple key types (JWT, session, data, API)
   - Status tracking (active, rotated, compromised)
   - Audit trail
   
3. **MFA Configuration**
   - TOTP setup
   - Backup codes (10 per user)
   - Recovery options
   - Trusted devices
   
4. **Password History**
   - Last 12 passwords
   - Prevents password reuse
   - Change tracking
   
5. **Failed Login Attempts**
   - IP-based tracking
   - Account lockout logic
   - Geographic anomaly detection
   
6. **Security Events**
   - Critical security incidents
   - Severity levels
   - Automated alerting
   - Resolution tracking
   
7. **Security Metrics**
   - Daily aggregated statistics
   - Trend analysis
   - Anomaly detection
   
8. **Data Classification**
   - Sensitivity levels
   - Access tracking
   - Compliance tagging

**Compliance**:
- OWASP Top 10
- SOC 2 Type II
- GDPR Article 32
- PCI DSS v3.2.1

---

## 🔧 Migration Commands

### Check Status

```bash
# View current migration status
npm run migrate:status

# Output example:
# ✅ Migration 001: initial_schema (executed)
# ⏳ Migration 002: session2_security_enhancements (pending)
# Summary: 1 executed, 1 pending, 2 total
```

### Run Migrations

```bash
# Run all pending migrations
npm run migrate

# Run specific migration (advanced)
node src/cli/migrate.js --target 001

# Dry run (preview changes)
node src/cli/migrate.js --dry-run
```

### Rollback

```bash
# Rollback last migration
npm run migrate:rollback

# Rollback multiple migrations
node src/cli/migrate.js rollback 2

# Rollback to specific migration
node src/cli/migrate.js rollback --to 001
```

### Create New Migration

```bash
# Create new SQL migration
npm run migrate:create add_new_feature

# Create JS migration (for complex logic)
node src/cli/migrate.js create add_new_feature js

# Output: migrations/1705312345678_add_new_feature.sql
```

### Verify Integrity

```bash
# Verify migration checksums
npm run migrate:verify

# Output:
# ✅ All migrations verified
# OR
# ❌ Migration 002 checksum mismatch!
```

---

## 📝 Manual Migration (If CLI Unavailable)

If you need to run migrations manually:

### PostgreSQL Command Line

```bash
# Connect to database
psql postgresql://user:password@localhost:5432/zekka_production

# Run migration 001
\i migrations/001_initial_schema.sql

# Run migration 002
\i migrations/002_session2_security_enhancements.sql

# Verify tables created
\dt

# Check roles
SELECT * FROM roles;
```

### Docker PostgreSQL

```bash
# Copy migrations to container
docker cp migrations/ postgres_container:/tmp/

# Execute in container
docker exec -it postgres_container psql -U user -d zekka_production -f /tmp/migrations/001_initial_schema.sql
docker exec -it postgres_container psql -U user -d zekka_production -f /tmp/migrations/002_session2_security_enhancements.sql
```

---

## 🔍 Verification

### After Migration 001

```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected tables:
-- api_keys, audit_log_basic, permissions, role_permissions,
-- roles, sessions, user_roles, users

-- Check default roles
SELECT * FROM roles ORDER BY level DESC;

-- Expected output:
-- superadmin (100), admin (50), moderator (10), user (0)

-- Check permissions
SELECT COUNT(*) FROM permissions;
-- Expected: 10

-- Check role permissions
SELECT r.name, COUNT(p.id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
GROUP BY r.name
ORDER BY permission_count DESC;

-- Expected:
-- superadmin: 10
-- admin: 9
-- moderator: 2
-- user: 3
```

### After Migration 002

```sql
-- Check new tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%audit%'
ORDER BY table_name;

-- Expected new tables:
-- audit_logs, encryption_keys, mfa_configurations,
-- password_history, failed_login_attempts, security_events,
-- security_metrics, data_classification

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' AND tablename = 'audit_logs';

-- Expected: 6+ indexes for performance
```

---

## ⚠️ Important Notes

### Before Running Migrations

1. **Backup Your Database**:
   ```bash
   # Create backup
   pg_dump zekka_production > backup_$(date +%Y%m%d_%H%M%S).sql
   
   # OR use automated script
   npm run backup:db
   ```

2. **Test in Staging First**:
   ```bash
   # Run on staging database
   DATABASE_URL=postgresql://user:pass@localhost:5432/zekka_staging npm run migrate
   
   # Verify
   DATABASE_URL=postgresql://user:pass@localhost:5432/zekka_staging npm run migrate:status
   ```

3. **Check Disk Space**:
   ```bash
   # Check available space
   df -h
   
   # Estimate migration size
   du -sh migrations/
   ```

### Migration 002 Considerations

- **Large Table**: `audit_logs` can grow quickly
  - Enable partitioning in production
  - Configure log rotation
  - Monitor disk usage

- **Indexes**: Migration creates many indexes
  - Initial creation takes time (~5-10 min)
  - Impacts write performance slightly
  - Benefits: Fast audit queries

- **Retention**: 90-day default retention
  - Adjust `retention_days` as needed
  - Set up cleanup job (cron)

---

## 🐛 Troubleshooting

### Migration Fails

```bash
# Error: "relation already exists"
# Solution: Check if tables exist
psql -d zekka_production -c "\dt"

# If tables exist, mark migration as run
# (Use with caution!)
node src/cli/migrate.js --mark-as-run 001

# Error: "permission denied"
# Solution: Ensure database user has CREATE permission
psql -d zekka_production -c "GRANT CREATE ON SCHEMA public TO your_user;"
```

### Rollback Issues

```bash
# Error: "cannot rollback migration 001"
# Reason: Migration 001 doesn't have down migration
# Solution: Manual cleanup required

# Drop tables (DANGER!)
psql -d zekka_production << EOF
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS audit_log_basic CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
EOF
```

### Performance Issues

```bash
# Large migration taking too long
# Solution: Run with increased timeout
DATABASE_QUERY_TIMEOUT=600000 npm run migrate

# Or split into smaller migrations
# Create migration 002a, 002b, etc.
```

---

## 📊 Migration Tracking

Migrations are tracked in the `migrations` table:

```sql
-- View migration history
SELECT * FROM migrations ORDER BY executed_at DESC;

-- Expected columns:
-- id, name, checksum, executed_at, execution_time_ms

-- Check migration order
SELECT id, name, executed_at FROM migrations ORDER BY id;
```

---

## 🚀 Next Steps After Migrations

1. **Verify Application Connection**:
   ```bash
   npm run validate:env
   ```

2. **Run Tests**:
   ```bash
   npm test
   npm run test:integration
   ```

3. **Create First User** (if needed):
   ```bash
   # Using application API
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"SecurePass123!","username":"admin"}'
   
   # OR via SQL
   psql -d zekka_production -c "
   INSERT INTO users (email, username, password_hash, is_verified) 
   VALUES ('admin@example.com', 'admin', '\$2b\$12\$...', true);
   "
   ```

4. **Assign Admin Role**:
   ```sql
   -- Find user and superadmin role IDs
   SELECT u.id as user_id, r.id as role_id 
   FROM users u, roles r 
   WHERE u.email = 'admin@example.com' AND r.name = 'superadmin';
   
   -- Assign role
   INSERT INTO user_roles (user_id, role_id) VALUES (user_id, role_id);
   ```

---

## 📞 Support

**Migration Issues**:
- Review logs: `logs/application.log`
- Check database: `psql -d zekka_production`
- Run diagnostics: `npm run migrate:verify`

**Documentation**:
- Migration CLI: [src/cli/migrate.js](../src/cli/migrate.js)
- Migration Manager: [src/utils/migration-manager.js](../src/utils/migration-manager.js)
- Deployment Guide: [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md)

---

**Last Updated**: 2026-01-15  
**Next Migration**: TBD (create with `npm run migrate:create`)
