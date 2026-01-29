#!/bin/bash
#
# ClickHouse Restore Script
# =========================
#
# Restores ClickHouse database from S3 backup using clickhouse-backup.
#
# Usage:
#   ./restore-clickhouse.sh --backup <backup_name> [--tables <pattern>]
#   ./restore-clickhouse.sh --list
#   ./restore-clickhouse.sh --latest
#

set -euo pipefail

# Configuration
S3_BUCKET="${S3_BUCKET:-novasight-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"
CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-localhost}"
CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-9000}"
CLICKHOUSE_USER="${CLICKHOUSE_USER:-default}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "[$(date -Iseconds)] ${GREEN}INFO${NC}: $1"
}

log_warn() {
    echo -e "[$(date -Iseconds)] ${YELLOW}WARN${NC}: $1"
}

log_error() {
    echo -e "[$(date -Iseconds)] ${RED}ERROR${NC}: $1" >&2
}

show_help() {
    cat << EOF
ClickHouse Restore Script for NovaSight

Usage:
  $(basename "$0") [OPTIONS]

Options:
  -b, --backup <name>     Backup name to restore
  -t, --tables <pattern>  Table pattern to restore (e.g., "db.*" or "db.table")
  -l, --list              List available backups
  --latest                Restore from latest backup
  --schema-only           Restore schema only (no data)
  --data-only             Restore data only (schema must exist)
  --drop                  Drop existing tables before restore
  --dry-run               Show what would be done without making changes
  -h, --help              Show this help message

Examples:
  # List available backups
  $(basename "$0") --list

  # Restore from specific backup
  $(basename "$0") --backup backup_20240115_020000

  # Restore specific database
  $(basename "$0") --backup backup_20240115_020000 --tables "analytics.*"

  # Restore latest backup
  $(basename "$0") --latest

Environment Variables:
  S3_BUCKET          S3 bucket name (default: novasight-backups)
  AWS_REGION         AWS region (default: us-east-1)
  CLICKHOUSE_HOST    ClickHouse host (default: localhost)
  CLICKHOUSE_PORT    ClickHouse port (default: 9000)
  CLICKHOUSE_USER    ClickHouse user (default: default)
  CLICKHOUSE_PASSWORD ClickHouse password (required for restore)
EOF
}

check_clickhouse_backup() {
    if ! command -v clickhouse-backup &> /dev/null; then
        log_error "clickhouse-backup is not installed"
        log_info "Install it from: https://github.com/AltinitY/clickhouse-backup"
        exit 1
    fi
}

list_backups() {
    log_info "Listing remote ClickHouse backups..."
    clickhouse-backup list remote
}

list_local_backups() {
    log_info "Listing local ClickHouse backups..."
    clickhouse-backup list local
}

get_latest_backup() {
    clickhouse-backup list remote | head -n 1 | awk '{print $1}'
}

download_backup() {
    local backup_name=$1
    
    log_info "Downloading backup: ${backup_name}"
    clickhouse-backup download "${backup_name}"
    log_info "Download completed"
}

restore_backup() {
    local backup_name=$1
    local tables=$2
    local schema_only=$3
    local data_only=$4
    local drop=$5
    local dry_run=$6
    
    if [[ "${dry_run}" == "true" ]]; then
        log_info "[DRY RUN] Would restore backup: ${backup_name}"
        [[ -n "${tables}" ]] && log_info "[DRY RUN] Tables filter: ${tables}"
        [[ "${schema_only}" == "true" ]] && log_info "[DRY RUN] Schema only"
        [[ "${data_only}" == "true" ]] && log_info "[DRY RUN] Data only"
        [[ "${drop}" == "true" ]] && log_info "[DRY RUN] Would drop existing tables"
        return 0
    fi
    
    # Check if backup exists locally
    if ! clickhouse-backup list local | grep -q "^${backup_name}"; then
        log_info "Backup not found locally, downloading..."
        download_backup "${backup_name}"
    fi
    
    # Build restore command
    local restore_opts=()
    
    if [[ -n "${tables}" ]]; then
        restore_opts+=("--tables" "${tables}")
    fi
    
    if [[ "${schema_only}" == "true" ]]; then
        restore_opts+=("--schema")
    fi
    
    if [[ "${data_only}" == "true" ]]; then
        restore_opts+=("--data")
    fi
    
    if [[ "${drop}" == "true" ]]; then
        restore_opts+=("--rm")
    fi
    
    log_info "Starting restore: ${backup_name}"
    log_info "Options: ${restore_opts[*]:-none}"
    
    clickhouse-backup restore "${restore_opts[@]}" "${backup_name}"
    
    log_info "Restore completed successfully!"
    log_info ""
    log_info "Verification:"
    log_info "  clickhouse-client --query 'SELECT count() FROM system.tables WHERE database NOT IN (\"system\", \"INFORMATION_SCHEMA\", \"information_schema\")'"
}

cleanup_local_backup() {
    local backup_name=$1
    
    log_info "Cleaning up local backup: ${backup_name}"
    clickhouse-backup delete local "${backup_name}"
}

# Parse arguments
BACKUP_NAME=""
TABLES=""
LIST_BACKUPS=false
LATEST=false
SCHEMA_ONLY=false
DATA_ONLY=false
DROP=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--backup)
            BACKUP_NAME="$2"
            shift 2
            ;;
        -t|--tables)
            TABLES="$2"
            shift 2
            ;;
        -l|--list)
            LIST_BACKUPS=true
            shift
            ;;
        --latest)
            LATEST=true
            shift
            ;;
        --schema-only)
            SCHEMA_ONLY=true
            shift
            ;;
        --data-only)
            DATA_ONLY=true
            shift
            ;;
        --drop)
            DROP=true
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

# Check dependencies
check_clickhouse_backup

# Execute
if [[ "${LIST_BACKUPS}" == "true" ]]; then
    list_backups
    echo ""
    list_local_backups
    exit 0
fi

if [[ "${LATEST}" == "true" ]]; then
    BACKUP_NAME=$(get_latest_backup)
    if [[ -z "${BACKUP_NAME}" ]]; then
        log_error "No backups found"
        exit 1
    fi
    log_info "Using latest backup: ${BACKUP_NAME}"
fi

if [[ -z "${BACKUP_NAME}" ]]; then
    log_error "Backup name is required. Use --backup <name> or --latest"
    show_help
    exit 1
fi

if [[ "${SCHEMA_ONLY}" == "true" && "${DATA_ONLY}" == "true" ]]; then
    log_error "Cannot use --schema-only and --data-only together"
    exit 1
fi

restore_backup "${BACKUP_NAME}" "${TABLES}" "${SCHEMA_ONLY}" "${DATA_ONLY}" "${DROP}" "${DRY_RUN}"

# Ask about cleanup
if [[ "${DRY_RUN}" != "true" ]]; then
    read -p "Clean up local backup? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cleanup_local_backup "${BACKUP_NAME}"
    fi
fi
