# Backup And Restore Runbook

This runbook is the operational source of truth for database backup and restore on the Zekka platform.

## Backup Automation

- Primary backup script: `scripts/backup-database.sh`
- Kubernetes scheduled backup: `k8s/statefulset-postgres.yaml`
  - Cron schedule: `0 2 * * *`
  - Retention: 7 days in the PVC-backed backup volume
- Local/scripted retention: controlled by `BACKUP_RETENTION_DAYS`
- Backup integrity checks:
  - gzip integrity test
  - non-empty file check
  - SHA-256 checksum file generation when `sha256sum` is available

## Restore Procedure

Use `scripts/restore-database.sh` to restore a gzip-compressed SQL dump:

```bash
DATABASE_HOST=localhost \
DATABASE_PORT=5432 \
DATABASE_NAME=zekka_production \
DATABASE_USER=zekka_user \
DATABASE_PASSWORD=... \
./scripts/restore-database.sh /path/to/zekka_backup_YYYYMMDD_HHMMSS.sql.gz
```

Optional environment flags:

- `RESTORE_SKIP_CONFIRMATION=true`
- `RESTORE_DROP_PUBLIC=true`
- `RESTORE_LOG_FILE=/path/to/restore.log`

## Pre-Restore Checklist

- Confirm the backup file exists and matches the expected SHA-256 checksum.
- Restore into staging first unless this is an active disaster-recovery event.
- Confirm application maintenance window and rollback owner.
- Confirm database credentials and target host.

## Post-Restore Verification

- Run a basic connectivity query: `SELECT NOW();`
- Verify expected tables exist.
- Run application health checks against `/livez` and `/readyz`.
- Confirm authentication and one representative read/write flow.

## Validation Expectation

Before production cutover, perform and document at least one full restore rehearsal in a staging environment using a fresh backup artifact.
