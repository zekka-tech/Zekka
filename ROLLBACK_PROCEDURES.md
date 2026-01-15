# 🔄 ROLLBACK PROCEDURES
## Zekka Framework v3.0.0

**Critical Document**: Keep this accessible during deployments

---

## 📋 TABLE OF CONTENTS

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Rollback Triggers](#rollback-triggers)
3. [Application Rollback](#application-rollback)
4. [Database Rollback](#database-rollback)
5. [Configuration Rollback](#configuration-rollback)
6. [Emergency Procedures](#emergency-procedures)
7. [Post-Rollback Actions](#post-rollback-actions)

---

## PRE-DEPLOYMENT CHECKLIST

Before any deployment, ensure:

- [ ] **Backup completed** (database + files)
- [ ] **Git tag created** for current stable version
- [ ] **Rollback plan reviewed** with team
- [ ] **Monitoring dashboard open** for real-time metrics
- [ ] **Communication channels ready** (Slack, PagerDuty)
- [ ] **Previous version artifacts available**
- [ ] **Database migration tested** in staging
- [ ] **Health check endpoints working**

---

## ROLLBACK TRIGGERS

### Immediate Rollback Required 🚨

Execute rollback immediately if:

1. **Error rate > 5%** for 5+ minutes
2. **Response time p95 > 2s** sustained
3. **Database connections exhausted**
4. **Critical security vulnerability** discovered
5. **Data corruption** detected
6. **Complete service outage**

### Rollback Consideration ⚠️

Consider rollback if:

1. Error rate > 2% for 10+ minutes
2. Response time p95 > 1s for 10+ minutes
3. Memory usage > 90% sustained
4. Failed login rate abnormally high
5. Cache hit rate drops below 50%

---

## APPLICATION ROLLBACK

### Method 1: Docker Rollback (Recommended)

**Fastest rollback method for containerized deployments**

```bash
#!/bin/bash
# Quick rollback to previous Docker image

# 1. Stop current version
docker-compose down

# 2. Switch to previous version
export IMAGE_TAG=v2.9.0  # Previous stable version
docker-compose up -d

# 3. Verify rollback
curl http://localhost:3000/api/health
docker-compose logs -f --tail=100 app
```

**Estimated Time**: 2-5 minutes

### Method 2: Git Rollback

**For non-containerized deployments**

```bash
#!/bin/bash
# Rollback application code via Git

# 1. Identify previous stable version
git tag -l | tail -5

# 2. Checkout previous version
git checkout v2.9.0

# 3. Reinstall dependencies (if needed)
npm ci --only=production

# 4. Restart application
pm2 restart zekka-app

# 5. Verify
curl http://localhost:3000/api/health
pm2 logs zekka-app --nostream --lines 50
```

**Estimated Time**: 5-10 minutes

### Method 3: Binary Artifact Rollback

```bash
#!/bin/bash
# Rollback using pre-built artifacts

# 1. Stop current application
pm2 stop zekka-app

# 2. Restore previous version from backup
cd /opt/zekka
rm -rf current
cp -r /opt/zekka/backups/v2.9.0 current

# 3. Start application
cd current
pm2 start ecosystem.config.cjs

# 4. Verify
curl http://localhost:3000/api/health
```

**Estimated Time**: 3-7 minutes

---

## DATABASE ROLLBACK

### Pre-Rollback Database Backup

**ALWAYS create a snapshot before rollback:**

```bash
#!/bin/bash
# Emergency database backup

# PostgreSQL backup
pg_dump -U ${DB_USER} -h ${DB_HOST} -d ${DB_NAME} \
  > emergency-backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup
ls -lh emergency-backup-*.sql
```

### Migration Rollback

**Use built-in migration rollback:**

```bash
#!/bin/bash
# Rollback last migration

# 1. Check current migration status
npm run migrate:status

# 2. Rollback last migration
npm run migrate:rollback

# 3. Verify rollback
npm run migrate:status

# 4. Test database integrity
psql -U ${DB_USER} -d ${DB_NAME} -c "SELECT COUNT(*) FROM users;"
```

### Manual Migration Rollback

**If automated rollback fails:**

```sql
-- Connect to database
psql -U zekka_user -d zekka_production

-- Begin transaction
BEGIN;

-- Verify current schema version
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;

-- Apply down migration (example)
DROP TABLE IF EXISTS new_feature_table;
ALTER TABLE users DROP COLUMN IF EXISTS new_column;

-- Update schema version
DELETE FROM schema_migrations WHERE version = '20240115_session2_security';

-- Verify changes
\dt
\d users

-- Commit if everything looks good
COMMIT;
-- Or rollback if issues found
-- ROLLBACK;
```

### Database Restore from Backup

**Last resort - full database restore:**

```bash
#!/bin/bash
# Restore database from backup

# 1. Stop application (prevent writes)
docker-compose stop app

# 2. Restore database
psql -U ${DB_USER} -h ${DB_HOST} -d ${DB_NAME} \
  < backups/zekka_production_20240114.sql

# 3. Verify restore
psql -U ${DB_USER} -d ${DB_NAME} -c "SELECT COUNT(*) FROM users;"

# 4. Restart application
docker-compose start app

# 5. Monitor for errors
docker-compose logs -f app
```

**Estimated Time**: 10-30 minutes (depends on database size)

---

## CONFIGURATION ROLLBACK

### Environment Variables

```bash
#!/bin/bash
# Rollback environment configuration

# 1. Backup current config
cp .env.production .env.production.failed

# 2. Restore previous config
cp .env.production.backup .env.production

# 3. Restart application
docker-compose restart app

# 4. Verify configuration
docker-compose exec app env | grep -E "NODE_ENV|DB_|REDIS_"
```

### Nginx Configuration Rollback

```bash
#!/bin/bash
# Rollback Nginx configuration

# 1. Restore previous config
sudo cp /etc/nginx/sites-available/zekka.backup \
        /etc/nginx/sites-available/zekka

# 2. Test configuration
sudo nginx -t

# 3. Reload Nginx
sudo systemctl reload nginx

# 4. Verify
curl -I https://yourdomain.com/api/health
```

---

## EMERGENCY PROCEDURES

### Total System Failure

**Complete rollback of all components:**

```bash
#!/bin/bash
# EMERGENCY: Complete system rollback

set -e

echo "🚨 EMERGENCY ROLLBACK INITIATED"
echo "================================"

# 1. Create emergency backup
echo "Creating emergency backup..."
./scripts/emergency-backup.sh

# 2. Stop all services
echo "Stopping all services..."
docker-compose down

# 3. Rollback database
echo "Rolling back database..."
psql -U ${DB_USER} -d ${DB_NAME} < backups/last-stable.sql

# 4. Switch to previous version
echo "Switching to previous version..."
git checkout v2.9.0

# 5. Start services
echo "Starting services with previous version..."
docker-compose up -d

# 6. Wait for health check
echo "Waiting for services to be healthy..."
sleep 30

# 7. Verify all services
echo "Verifying services..."
curl -f http://localhost:3000/api/health || exit 1
curl -f http://localhost:9090/-/healthy || exit 1

echo "✅ Emergency rollback completed"
echo "================================"
echo "Next steps:"
echo "1. Monitor metrics in Grafana"
echo "2. Review logs for errors"
echo "3. Notify team of rollback"
echo "4. Plan incident postmortem"
```

### Communication Template

**Notify stakeholders immediately:**

```text
🚨 PRODUCTION ROLLBACK NOTIFICATION

Time: [TIMESTAMP]
Severity: [CRITICAL/HIGH/MEDIUM]
System: Zekka Framework

REASON:
- [Describe issue that triggered rollback]
- Error rate: [X]%
- Affected users: [estimated number]

ACTION TAKEN:
- Rolled back to version: v2.9.0
- Database: [Rolled back / No rollback needed]
- Services restored at: [TIMESTAMP]

CURRENT STATUS:
- Application: [HEALTHY/DEGRADED/DOWN]
- Error rate: [X]%
- Response time: [X]ms

NEXT STEPS:
1. [Action 1]
2. [Action 2]
3. [Action 3]

Point of Contact: [Name, Phone, Email]
Incident ID: [ID]
```

---

## POST-ROLLBACK ACTIONS

### Immediate Actions (Within 1 Hour)

1. **Verify System Health**
   ```bash
   # Check all health endpoints
   curl http://localhost:3000/api/health
   curl http://localhost:9090/-/healthy
   curl http://localhost:3001/api/health
   
   # Check error rates
   # Open Grafana dashboard
   # Verify metrics returning to normal
   ```

2. **Review Logs**
   ```bash
   # Application logs
   docker-compose logs --tail=500 app | grep -i error
   
   # Database logs
   docker-compose logs --tail=200 postgres | grep -i error
   
   # Nginx logs
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Notify Stakeholders**
   - Send "All Clear" notification
   - Update status page
   - Brief team on what happened

### Short-term Actions (Within 24 Hours)

1. **Root Cause Analysis**
   - Review deployment logs
   - Analyze metrics before failure
   - Identify what went wrong
   - Document findings

2. **Fix and Test**
   - Fix identified issues
   - Test thoroughly in staging
   - Add tests to prevent recurrence

3. **Update Procedures**
   - Document lessons learned
   - Update deployment checklist
   - Improve monitoring/alerts

### Long-term Actions (Within 1 Week)

1. **Postmortem Meeting**
   - Review timeline
   - Discuss root cause
   - Identify improvements
   - Assign action items

2. **Process Improvements**
   - Update CI/CD pipeline
   - Add automated checks
   - Improve monitoring
   - Update documentation

3. **Team Training**
   - Share learnings
   - Practice rollback procedures
   - Update runbooks

---

## VERIFICATION CHECKLIST

After rollback, verify:

- [ ] Application health endpoint returns 200
- [ ] Error rate < 1%
- [ ] Response time p95 < 500ms
- [ ] Database connections healthy
- [ ] Redis cache operational
- [ ] All services showing "UP" in Prometheus
- [ ] No critical alerts firing
- [ ] Login functionality works
- [ ] Key user workflows functional
- [ ] Monitoring dashboards accessible
- [ ] Logs showing normal activity

---

## ROLLBACK DECISION MATRIX

| Metric | Normal | Warning | Critical | Action |
|--------|--------|---------|----------|--------|
| Error Rate | <1% | 1-2% | >2% | Consider rollback |
| Response Time (p95) | <500ms | 500ms-1s | >1s | Monitor closely |
| CPU Usage | <70% | 70-85% | >85% | Investigate |
| Memory Usage | <80% | 80-90% | >90% | Consider rollback |
| Database Connections | <80% | 80-90% | >90% | Immediate action |
| Failed Logins | <10/min | 10-50/min | >50/min | Security review |

---

## CONTACT INFORMATION

### Emergency Contacts

- **On-Call Engineer**: [Phone Number]
- **DevOps Lead**: [Phone Number]
- **CTO**: [Phone Number]
- **PagerDuty**: [Link]

### Escalation Path

1. On-Call Engineer (0-15 minutes)
2. DevOps Lead (15-30 minutes)
3. CTO (30+ minutes)

---

## QUICK REFERENCE COMMANDS

```bash
# View current version
git describe --tags

# List recent deployments
git log --oneline -10

# Check application health
curl http://localhost:3000/api/health

# View error rates
# Open Grafana: http://localhost:3001

# Quick rollback (Docker)
docker-compose down && \
export IMAGE_TAG=v2.9.0 && \
docker-compose up -d

# Emergency database backup
pg_dump -U $DB_USER -d $DB_NAME > emergency-$(date +%Y%m%d-%H%M%S).sql
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-15  
**Next Review**: 2026-02-15

---

**⚠️ IMPORTANT**: Practice these procedures regularly in staging environment to ensure team familiarity and procedure accuracy.
