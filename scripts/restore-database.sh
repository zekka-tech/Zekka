#!/bin/bash
# ==================================
# Zekka Framework - Database Restore Script
# ==================================

set -euo pipefail

if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

BACKUP_FILE="${1:-}"
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-zekka_production}"
DB_USER="${DATABASE_USER:-zekka_user}"
DB_PASSWORD="${DATABASE_PASSWORD:-}"
LOG_FILE="${RESTORE_LOG_FILE:-/tmp/zekka-restore.log}"
RESTORE_DROP_PUBLIC="${RESTORE_DROP_PUBLIC:-false}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    log "ERROR: $1"
    exit 1
}

check_dependencies() {
    command -v psql >/dev/null 2>&1 || error "psql not found"
    command -v gunzip >/dev/null 2>&1 || error "gunzip not found"
}

check_inputs() {
    [ -n "$BACKUP_FILE" ] || error "Usage: ./scripts/restore-database.sh <backup-file.sql.gz>"
    [ -f "$BACKUP_FILE" ] || error "Backup file not found: $BACKUP_FILE"
    [ -n "$DB_PASSWORD" ] || error "DATABASE_PASSWORD must be set"
}

confirm_restore() {
    if [ "${RESTORE_SKIP_CONFIRMATION:-false}" = "true" ]; then
        return
    fi

    echo "Restore target: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    echo "Backup file: ${BACKUP_FILE}"
    echo "This operation will write into the target database."
    read -r -p "Type RESTORE to continue: " confirmation
    [ "$confirmation" = "RESTORE" ] || error "Restore cancelled"
}

prepare_database() {
    if [ "$RESTORE_DROP_PUBLIC" != "true" ]; then
        return
    fi

    log "Dropping and recreating public schema before restore"
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -v ON_ERROR_STOP=1 \
        -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
}

run_restore() {
    log "Restoring database from $BACKUP_FILE"
    PGPASSWORD="$DB_PASSWORD" gunzip -c "$BACKUP_FILE" | psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -v ON_ERROR_STOP=1
}

verify_restore() {
    log "Running post-restore verification query"
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -tAc "SELECT NOW();" >/dev/null
}

main() {
    check_dependencies
    check_inputs
    confirm_restore
    prepare_database
    run_restore
    verify_restore
    log "Restore completed successfully"
}

main "$@"
