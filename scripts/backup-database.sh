#!/bin/bash
# ==================================
# Zekka Framework - Automated Database Backup Script
# ==================================
# Features:
# - Full PostgreSQL database backup
# - Compression with gzip
# - Retention policy (configurable)
# - S3/Cloud storage support (optional)
# - Backup verification
# - Email notifications (optional)
# - Logging
# ==================================

set -euo pipefail

# ==================================
# CONFIGURATION
# ==================================

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Backup configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/zekka}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="zekka_backup_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

# Database configuration
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-zekka_production}"
DB_USER="${DATABASE_USER:-zekka_user}"
DB_PASSWORD="${DATABASE_PASSWORD}"

# S3 configuration (optional)
ENABLE_S3_UPLOAD="${ENABLE_S3_UPLOAD:-false}"
S3_BUCKET="${S3_BUCKET:-zekka-backups}"
S3_PREFIX="${S3_PREFIX:-database}"

# Notification configuration (optional)
ENABLE_EMAIL_NOTIFICATION="${ENABLE_EMAIL_NOTIFICATION:-false}"
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-admin@example.com}"

# Logging
LOG_FILE="${BACKUP_DIR}/backup.log"

# ==================================
# FUNCTIONS
# ==================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    log "ERROR: $1"
    send_notification "Backup Failed" "Database backup failed: $1"
    exit 1
}

send_notification() {
    if [ "$ENABLE_EMAIL_NOTIFICATION" = "true" ]; then
        local subject="$1"
        local message="$2"
        echo "$message" | mail -s "$subject" "$NOTIFICATION_EMAIL" || log "Failed to send email notification"
    fi
}

check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump not found. Please install PostgreSQL client tools."
    fi
    
    if ! command -v gzip &> /dev/null; then
        error "gzip not found. Please install gzip."
    fi
    
    if [ "$ENABLE_S3_UPLOAD" = "true" ]; then
        if ! command -v aws &> /dev/null; then
            error "aws CLI not found. Please install AWS CLI for S3 uploads."
        fi
    fi
}

create_backup_directory() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR" || error "Failed to create backup directory"
    fi
}

perform_backup() {
    log "Starting database backup..."
    log "Database: $DB_NAME"
    log "Backup file: $BACKUP_PATH"
    
    # Set password for pg_dump
    export PGPASSWORD="$DB_PASSWORD"
    
    # Perform backup with compression
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl \
        --verbose \
        2>> "$LOG_FILE" | gzip > "$BACKUP_PATH"; then
        
        unset PGPASSWORD
        
        # Get backup size
        local backup_size=$(du -h "$BACKUP_PATH" | cut -f1)
        log "Backup completed successfully"
        log "Backup size: $backup_size"
        
        return 0
    else
        unset PGPASSWORD
        error "Database backup failed"
    fi
}

verify_backup() {
    log "Verifying backup integrity..."
    
    # Check if file exists
    if [ ! -f "$BACKUP_PATH" ]; then
        error "Backup file not found: $BACKUP_PATH"
    fi
    
    # Check if file is not empty
    if [ ! -s "$BACKUP_PATH" ]; then
        error "Backup file is empty: $BACKUP_PATH"
    fi
    
    # Verify gzip integrity
    if gzip -t "$BACKUP_PATH" 2>/dev/null; then
        log "Backup integrity verified"
        return 0
    else
        error "Backup file is corrupted"
    fi
}

upload_to_s3() {
    if [ "$ENABLE_S3_UPLOAD" = "true" ]; then
        log "Uploading backup to S3..."
        
        local s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_FILENAME}"
        
        if aws s3 cp "$BACKUP_PATH" "$s3_path" \
            --storage-class STANDARD_IA \
            --server-side-encryption AES256 \
            2>> "$LOG_FILE"; then
            log "Backup uploaded to S3: $s3_path"
        else
            log "WARNING: Failed to upload backup to S3"
        fi
    fi
}

cleanup_old_backups() {
    log "Cleaning up old backups (retention: ${BACKUP_RETENTION_DAYS} days)..."
    
    # Find and delete old backups
    find "$BACKUP_DIR" -name "zekka_backup_*.sql.gz" -type f -mtime +"$BACKUP_RETENTION_DAYS" -delete
    
    local deleted_count=$(find "$BACKUP_DIR" -name "zekka_backup_*.sql.gz" -type f -mtime +"$BACKUP_RETENTION_DAYS" | wc -l)
    
    if [ "$deleted_count" -gt 0 ]; then
        log "Deleted $deleted_count old backup(s)"
    else
        log "No old backups to delete"
    fi
    
    # Cleanup S3 old backups if enabled
    if [ "$ENABLE_S3_UPLOAD" = "true" ]; then
        log "Cleaning up old S3 backups..."
        # Note: Consider using S3 lifecycle policies instead
        aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | \
            awk '{print $4}' | \
            grep "zekka_backup_" | \
            while read -r file; do
                # Calculate file age (simplified, consider using proper date comparison)
                local file_date=$(echo "$file" | grep -oP '\d{8}')
                # Add proper date comparison logic here if needed
            done
    fi
}

generate_backup_report() {
    log "Generating backup report..."
    
    local total_backups=$(find "$BACKUP_DIR" -name "zekka_backup_*.sql.gz" -type f | wc -l)
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    local latest_backup=$(ls -t "$BACKUP_DIR"/zekka_backup_*.sql.gz 2>/dev/null | head -1 | xargs basename)
    
    local report="
Zekka Framework - Backup Report
================================
Timestamp: $(date)
Latest Backup: ${latest_backup:-None}
Total Backups: $total_backups
Total Size: $total_size
Retention: $BACKUP_RETENTION_DAYS days
S3 Upload: $ENABLE_S3_UPLOAD
================================
"
    
    echo "$report" | tee -a "$LOG_FILE"
    
    send_notification "Backup Successful" "$report"
}

# ==================================
# MAIN EXECUTION
# ==================================

main() {
    log "=========================================="
    log "Zekka Framework - Database Backup"
    log "=========================================="
    
    # Pre-flight checks
    check_dependencies
    create_backup_directory
    
    # Perform backup
    perform_backup
    verify_backup
    
    # Upload to cloud storage
    upload_to_s3
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Generate report
    generate_backup_report
    
    log "Backup process completed successfully"
    log "=========================================="
}

# Run main function
main "$@"
