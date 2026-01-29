#!/bin/bash
#
# Tenant Data Recovery Script
# ===========================
#
# Recovers data for a specific tenant from backup.
# Extracts tenant-specific data and restores to isolated schema.
#
# Usage:
#   ./restore-tenant.sh --tenant-id <uuid> --backup-date <YYYYMMDD> [--target-schema <name>]
#

set -euo pipefail

# Configuration
S3_BUCKET="${S3_BUCKET:-novasight-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
RESTORE_DIR="/tmp/tenant_restore_$$"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "[$(date -Iseconds)] ${BLUE}STEP${NC}: $1"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf "${RESTORE_DIR}"
}

trap cleanup EXIT

show_help() {
    cat << EOF
Tenant Data Recovery Script for NovaSight

Recovers data for a specific tenant from a PostgreSQL backup.
Creates an isolated schema with the tenant's data for review before
merging back into the main database.

Usage:
  $(basename "$0") [OPTIONS]

Options:
  -t, --tenant-id <uuid>    Tenant UUID (required)
  -d, --backup-date <date>  Backup date in YYYYMMDD format
  -b, --backup <key>        Specific backup file to use
  -s, --target-schema <n>   Target schema name (default: restore_<tenant>_<timestamp>)
  -l, --list-tenants        List tenants in a backup
  --verify                  Verify restored data matches original counts
  --dry-run                 Show what would be done without making changes
  -h, --help                Show this help message

Examples:
  # Restore tenant from backup on specific date
  $(basename "$0") --tenant-id abc123-def456 --backup-date 20240115

  # Restore to specific schema
  $(basename "$0") --tenant-id abc123-def456 --backup-date 20240115 --target-schema my_restore

  # List tenants in a backup
  $(basename "$0") --list-tenants --backup postgresql_20240115_020000.sql.gz

Environment Variables:
  S3_BUCKET     S3 bucket name (default: novasight-backups)
  AWS_REGION    AWS region (default: us-east-1)
  PGHOST        PostgreSQL host (default: localhost)
  PGPORT        PostgreSQL port (default: 5432)
  PGUSER        PostgreSQL user (default: postgres)
  PGPASSWORD    PostgreSQL password (required)
EOF
}

find_backup_by_date() {
    local date=$1
    
    aws s3 ls "s3://${S3_BUCKET}/postgresql/" \
        --region "${AWS_REGION}" | \
        grep -E "postgresql_${date}" | \
        sort -r | \
        head -n 1 | \
        awk '{print $4}'
}

download_and_extract() {
    local backup_file=$1
    
    mkdir -p "${RESTORE_DIR}"
    
    log_info "Downloading backup: ${backup_file}"
    aws s3 cp "s3://${S3_BUCKET}/postgresql/${backup_file}" "${RESTORE_DIR}/${backup_file}" \
        --region "${AWS_REGION}"
    
    log_info "Extracting backup..."
    gunzip -k "${RESTORE_DIR}/${backup_file}"
    
    echo "${RESTORE_DIR}/${backup_file%.gz}"
}

list_tenants_in_backup() {
    local sql_file=$1
    
    log_info "Extracting tenant list from backup..."
    
    # Extract tenant information from the backup
    grep -E "^COPY public.tenants|^[a-f0-9-]{36}" "${sql_file}" | \
        grep -E "^[a-f0-9-]{36}" | \
        awk -F'\t' '{print $1, $2}' | \
        head -n 50
}

create_restore_schema() {
    local schema_name=$1
    local dry_run=$2
    
    log_step "Creating restore schema: ${schema_name}"
    
    if [[ "${dry_run}" == "true" ]]; then
        log_info "[DRY RUN] Would create schema: ${schema_name}"
        return 0
    fi
    
    psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d novasight << EOF
CREATE SCHEMA IF NOT EXISTS ${schema_name};
EOF
}

extract_tenant_data() {
    local sql_file=$1
    local tenant_id=$2
    local output_file=$3
    
    log_step "Extracting data for tenant: ${tenant_id}"
    
    # Create a script that extracts tenant-specific data
    cat > "${RESTORE_DIR}/extract_tenant.py" << 'PYTHON_SCRIPT'
import sys
import re

tenant_id = sys.argv[1]
input_file = sys.argv[2]
output_file = sys.argv[3]

# Tables that have tenant_id column
tenant_tables = [
    'users', 'connections', 'datasets', 'dashboards', 'charts',
    'pipelines', 'dag_runs', 'queries', 'audit_logs', 'api_keys'
]

in_copy = False
current_table = None
include_row = False

with open(input_file, 'r') as infile, open(output_file, 'w') as outfile:
    for line in infile:
        # Detect COPY statement
        copy_match = re.match(r'^COPY public\.(\w+)\s+', line)
        if copy_match:
            current_table = copy_match.group(1)
            in_copy = True
            if current_table in tenant_tables:
                outfile.write(line)
            continue
        
        # End of COPY block
        if line.strip() == '\\.' and in_copy:
            if current_table in tenant_tables:
                outfile.write(line)
            in_copy = False
            current_table = None
            continue
        
        # Process data rows
        if in_copy and current_table in tenant_tables:
            if tenant_id in line:
                outfile.write(line)
        elif not in_copy:
            # Include schema definitions
            if 'CREATE TABLE' in line or 'ALTER TABLE' in line:
                outfile.write(line)

print(f"Extraction complete: {output_file}")
PYTHON_SCRIPT
    
    python3 "${RESTORE_DIR}/extract_tenant.py" "${tenant_id}" "${sql_file}" "${output_file}"
}

restore_tenant_data() {
    local data_file=$1
    local schema_name=$2
    local dry_run=$3
    
    log_step "Restoring tenant data to schema: ${schema_name}"
    
    if [[ "${dry_run}" == "true" ]]; then
        log_info "[DRY RUN] Would restore data from ${data_file} to ${schema_name}"
        return 0
    fi
    
    # Replace public schema with target schema
    sed "s/public\./${schema_name}\./g" "${data_file}" | \
        psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d novasight
}

verify_restore() {
    local schema_name=$1
    local tenant_id=$2
    
    log_step "Verifying restored data..."
    
    psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d novasight << EOF
-- Count records in restored schema
SELECT 'users' as table_name, count(*) as count FROM ${schema_name}.users WHERE tenant_id = '${tenant_id}'
UNION ALL
SELECT 'connections', count(*) FROM ${schema_name}.connections WHERE tenant_id = '${tenant_id}'
UNION ALL
SELECT 'datasets', count(*) FROM ${schema_name}.datasets WHERE tenant_id = '${tenant_id}'
UNION ALL
SELECT 'dashboards', count(*) FROM ${schema_name}.dashboards WHERE tenant_id = '${tenant_id}';
EOF
}

# Parse arguments
TENANT_ID=""
BACKUP_DATE=""
BACKUP_FILE=""
TARGET_SCHEMA=""
LIST_TENANTS=false
VERIFY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tenant-id)
            TENANT_ID="$2"
            shift 2
            ;;
        -d|--backup-date)
            BACKUP_DATE="$2"
            shift 2
            ;;
        -b|--backup)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -s|--target-schema)
            TARGET_SCHEMA="$2"
            shift 2
            ;;
        -l|--list-tenants)
            LIST_TENANTS=true
            shift
            ;;
        --verify)
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

# Validate
if [[ -z "${PGPASSWORD:-}" ]]; then
    log_error "PGPASSWORD environment variable is required"
    exit 1
fi

# Get backup file
if [[ -z "${BACKUP_FILE}" && -n "${BACKUP_DATE}" ]]; then
    BACKUP_FILE=$(find_backup_by_date "${BACKUP_DATE}")
    if [[ -z "${BACKUP_FILE}" ]]; then
        log_error "No backup found for date: ${BACKUP_DATE}"
        exit 1
    fi
    log_info "Found backup: ${BACKUP_FILE}"
fi

# List tenants mode
if [[ "${LIST_TENANTS}" == "true" ]]; then
    if [[ -z "${BACKUP_FILE}" ]]; then
        log_error "Backup file required for listing tenants"
        exit 1
    fi
    sql_file=$(download_and_extract "${BACKUP_FILE}")
    list_tenants_in_backup "${sql_file}"
    exit 0
fi

# Restore mode
if [[ -z "${TENANT_ID}" ]]; then
    log_error "Tenant ID is required"
    show_help
    exit 1
fi

if [[ -z "${BACKUP_FILE}" ]]; then
    log_error "Backup file or date is required"
    show_help
    exit 1
fi

# Set default schema name
if [[ -z "${TARGET_SCHEMA}" ]]; then
    TENANT_SHORT=$(echo "${TENANT_ID}" | tr -d '-' | cut -c1-8)
    TARGET_SCHEMA="restore_${TENANT_SHORT}_$(date +%Y%m%d_%H%M%S)"
fi

log_info "Starting tenant data recovery"
log_info "Tenant ID: ${TENANT_ID}"
log_info "Backup: ${BACKUP_FILE}"
log_info "Target Schema: ${TARGET_SCHEMA}"

# Download and extract
sql_file=$(download_and_extract "${BACKUP_FILE}")

# Create schema
create_restore_schema "${TARGET_SCHEMA}" "${DRY_RUN}"

# Extract tenant data
tenant_data_file="${RESTORE_DIR}/tenant_data.sql"
extract_tenant_data "${sql_file}" "${TENANT_ID}" "${tenant_data_file}"

# Restore
restore_tenant_data "${tenant_data_file}" "${TARGET_SCHEMA}" "${DRY_RUN}"

# Verify if requested
if [[ "${VERIFY}" == "true" && "${DRY_RUN}" != "true" ]]; then
    verify_restore "${TARGET_SCHEMA}" "${TENANT_ID}"
fi

log_info ""
log_info "Tenant data recovery completed!"
log_info "Schema: ${TARGET_SCHEMA}"
log_info ""
log_info "To review the data:"
log_info "  psql -h ${PGHOST} -U ${PGUSER} -d novasight -c 'SET search_path TO ${TARGET_SCHEMA}; SELECT * FROM users LIMIT 10;'"
log_info ""
log_info "To merge back to production (CAUTION):"
log_info "  -- Review data first, then use INSERT ... ON CONFLICT or similar"
