#!/bin/bash
#
# PostgreSQL Restore Script
# =========================
#
# Restores PostgreSQL database from S3 backup.
# Supports full restore and tenant-specific restore.
#
# Usage:
#   ./restore-postgresql.sh --backup <backup_key> [--database <db_name>] [--verify]
#   ./restore-postgresql.sh --list [--days <n>]
#   ./restore-postgresql.sh --latest [--database <db_name>]
#

set -euo pipefail

# Configuration
S3_BUCKET="${S3_BUCKET:-novasight-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
RESTORE_DIR="/tmp/pg_restore_$$"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "[$(date -Iseconds)] ${GREEN}INFO${NC}: $1"
}

log_warn() {
    echo -e "[$(date -Iseconds)] ${YELLOW}WARN${NC}: $1"
}

log_error() {
    echo -e "[$(date -Iseconds)] ${RED}ERROR${NC}: $1" >&2
}

cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf "${RESTORE_DIR}"
}

trap cleanup EXIT

show_help() {
    cat << EOF
PostgreSQL Restore Script for NovaSight

Usage:
  $(basename "$0") [OPTIONS]

Options:
  -b, --backup <key>      S3 key of the backup to restore
  -d, --database <name>   Target database name (default: novasight_restore_<timestamp>)
  -l, --list              List available backups
  -n, --days <n>          Number of days to list (default: 30)
  --latest                Restore from latest backup
  -v, --verify            Verify backup integrity before restore
  --dry-run               Show what would be done without making changes
  -h, --help              Show this help message

Examples:
  # List available backups
  $(basename "$0") --list

  # Restore from specific backup
  $(basename "$0") --backup postgresql_20240115_020000.sql.gz

  # Restore latest backup to specific database
  $(basename "$0") --latest --database mydb_restore

  # Restore with verification
  $(basename "$0") --backup postgresql_20240115_020000.sql.gz --verify

Environment Variables:
  S3_BUCKET     S3 bucket name (default: novasight-backups)
  AWS_REGION    AWS region (default: us-east-1)
  PGHOST        PostgreSQL host (default: localhost)
  PGPORT        PostgreSQL port (default: 5432)
  PGUSER        PostgreSQL user (default: postgres)
  PGPASSWORD    PostgreSQL password (required)
EOF
}

list_backups() {
    local days=${1:-30}
    log_info "Listing PostgreSQL backups from last ${days} days..."
    
    aws s3 ls "s3://${S3_BUCKET}/postgresql/" \
        --region "${AWS_REGION}" | \
        grep -E '\.sql\.gz$' | \
        sort -r | \
        head -n 50
}

get_latest_backup() {
    aws s3 ls "s3://${S3_BUCKET}/postgresql/" \
        --region "${AWS_REGION}" | \
        grep -E '\.sql\.gz$' | \
        sort -r | \
        head -n 1 | \
        awk '{print $4}'
}

verify_backup() {
    local backup_file=$1
    local checksum_file="${backup_file%.sql.gz}.sha256"
    
    log_info "Verifying backup integrity..."
    
    # Download checksum
    if ! aws s3 cp "s3://${S3_BUCKET}/postgresql/${checksum_file}" "${RESTORE_DIR}/${checksum_file}" 2>/dev/null; then
        log_warn "Checksum file not found, skipping verification"
        return 0
    fi
    
    # Calculate checksum of downloaded backup
    local stored_checksum
    stored_checksum=$(cat "${RESTORE_DIR}/${checksum_file}" | awk '{print $1}')
    
    local calculated_checksum
    calculated_checksum=$(sha256sum "${RESTORE_DIR}/${backup_file}" | awk '{print $1}')
    
    if [[ "${stored_checksum}" == "${calculated_checksum}" ]]; then
        log_info "Backup integrity verified ✓"
        return 0
    else
        log_error "Backup integrity check failed!"
        log_error "Expected: ${stored_checksum}"
        log_error "Got: ${calculated_checksum}"
        return 1
    fi
}

restore_backup() {
    local backup_key=$1
    local target_db=$2
    local verify=$3
    local dry_run=$4
    
    # Create restore directory
    mkdir -p "${RESTORE_DIR}"
    
    # Extract just the filename if full path provided
    local backup_file
    backup_file=$(basename "${backup_key}")
    
    log_info "Downloading backup: ${backup_file}"
    if [[ "${dry_run}" == "true" ]]; then
        log_info "[DRY RUN] Would download s3://${S3_BUCKET}/postgresql/${backup_file}"
    else
        aws s3 cp "s3://${S3_BUCKET}/postgresql/${backup_file}" "${RESTORE_DIR}/${backup_file}" \
            --region "${AWS_REGION}"
    fi
    
    # Get backup size
    if [[ -f "${RESTORE_DIR}/${backup_file}" ]]; then
        local size
        size=$(du -h "${RESTORE_DIR}/${backup_file}" | cut -f1)
        log_info "Backup size: ${size}"
    fi
    
    # Verify if requested
    if [[ "${verify}" == "true" && "${dry_run}" != "true" ]]; then
        if ! verify_backup "${backup_file}"; then
            log_error "Backup verification failed, aborting restore"
            exit 1
        fi
    fi
    
    # Create target database
    log_info "Creating target database: ${target_db}"
    if [[ "${dry_run}" == "true" ]]; then
        log_info "[DRY RUN] Would create database: ${target_db}"
    else
        psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -c \
            "CREATE DATABASE ${target_db};" postgres || {
            log_error "Failed to create database ${target_db}"
            exit 1
        }
    fi
    
    # Restore
    log_info "Restoring backup to ${target_db}..."
    if [[ "${dry_run}" == "true" ]]; then
        log_info "[DRY RUN] Would restore ${backup_file} to ${target_db}"
    else
        gunzip -c "${RESTORE_DIR}/${backup_file}" | \
            psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${target_db}" || {
            log_error "Restore failed!"
            exit 1
        }
    fi
    
    log_info "Restore completed successfully!"
    log_info "Database: ${target_db}"
    log_info ""
    log_info "Verification queries:"
    log_info "  psql -h ${PGHOST} -U ${PGUSER} -d ${target_db} -c 'SELECT COUNT(*) FROM tenants;'"
    log_info ""
    log_info "To swap databases (during maintenance window):"
    log_info "  ALTER DATABASE novasight RENAME TO novasight_old;"
    log_info "  ALTER DATABASE ${target_db} RENAME TO novasight;"
}

# Parse arguments
BACKUP_KEY=""
DATABASE=""
LIST_BACKUPS=false
DAYS=30
LATEST=false
VERIFY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--backup)
            BACKUP_KEY="$2"
            shift 2
            ;;
        -d|--database)
            DATABASE="$2"
            shift 2
            ;;
        -l|--list)
            LIST_BACKUPS=true
            shift
            ;;
        -n|--days)
            DAYS="$2"
            shift 2
            ;;
        --latest)
            LATEST=true
            shift
            ;;
        -v|--verify)
            VERIFY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
if [[ -z "${PGPASSWORD:-}" && "${LIST_BACKUPS}" != "true" ]]; then
    log_error "PGPASSWORD environment variable is required"
    exit 1
fi

# Execute
if [[ "${LIST_BACKUPS}" == "true" ]]; then
    list_backups "${DAYS}"
    exit 0
fi

if [[ "${LATEST}" == "true" ]]; then
    BACKUP_KEY=$(get_latest_backup)
    if [[ -z "${BACKUP_KEY}" ]]; then
        log_error "No backups found"
        exit 1
    fi
    log_info "Using latest backup: ${BACKUP_KEY}"
fi

if [[ -z "${BACKUP_KEY}" ]]; then
    log_error "Backup key is required. Use --backup <key> or --latest"
    show_help
    exit 1
fi

# Set default database name
if [[ -z "${DATABASE}" ]]; then
    DATABASE="novasight_restore_$(date +%Y%m%d_%H%M%S)"
fi

restore_backup "${BACKUP_KEY}" "${DATABASE}" "${VERIFY}" "${DRY_RUN}"
