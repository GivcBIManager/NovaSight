# NovaSight Recovery Runbook

## Overview

This document provides step-by-step procedures for recovering NovaSight data stores from backups. Follow these procedures during disaster recovery scenarios or when restoring data to a specific point in time.

## Table of Contents

1. [Backup Overview](#backup-overview)
2. [PostgreSQL Recovery](#postgresql-recovery)
3. [ClickHouse Recovery](#clickhouse-recovery)
4. [Redis Recovery](#redis-recovery)
5. [Tenant-Specific Recovery](#tenant-specific-recovery)
6. [Post-Recovery Verification](#post-recovery-verification)
7. [Rollback Procedures](#rollback-procedures)

---

## Backup Overview

### Backup Schedule

| Database   | Frequency    | Retention | Storage Class   |
|------------|--------------|-----------|-----------------|
| PostgreSQL | Every 6 hrs  | 30 days   | S3 Standard-IA  |
| ClickHouse | Daily (2 AM) | 30 days   | S3 Standard-IA  |
| Redis      | Hourly       | 7 days    | S3 Standard-IA  |
| WAL Files  | Continuous   | 7 days    | S3 Standard-IA  |

### Backup Locations

```
s3://novasight-backups/
├── postgresql/
│   ├── postgresql_YYYYMMDD_HHMMSS.sql.gz
│   ├── postgresql_YYYYMMDD_HHMMSS.sha256
│   └── wal/
│       └── <wal_files>.gz
├── clickhouse/
│   └── backup_YYYYMMDD_HHMMSS/
└── redis/
    ├── redis_YYYYMMDD_HHMMSS.rdb
    └── redis_YYYYMMDD_HHMMSS.sha256
```

### Pre-Recovery Checklist

Before starting any recovery procedure:

- [ ] Identify the cause of data loss/corruption
- [ ] Determine the recovery point objective (RPO)
- [ ] Notify stakeholders of planned maintenance
- [ ] Ensure sufficient disk space for restore
- [ ] Verify AWS credentials and S3 access
- [ ] Have database credentials ready
- [ ] Consider read-only mode during recovery

---

## PostgreSQL Recovery

### Full Restore

Restores the entire PostgreSQL database from a backup.

#### Step 1: List Available Backups

```bash
# Using the restore script
./backup/scripts/restore-postgresql.sh --list --days 7

# Or directly from S3
aws s3 ls s3://novasight-backups/postgresql/
```

#### Step 2: Download and Verify Backup

```bash
# Download specific backup
aws s3 cp s3://novasight-backups/postgresql/postgresql_20240115_020000.sql.gz /tmp/

# Verify checksum
aws s3 cp s3://novasight-backups/postgresql/postgresql_20240115_020000.sha256 /tmp/
sha256sum -c /tmp/postgresql_20240115_020000.sha256
```

#### Step 3: Create Restore Database

```bash
# Connect to PostgreSQL
psql -h $PGHOST -U $PGUSER postgres

# Create new database for restore
CREATE DATABASE novasight_restore;
```

#### Step 4: Restore Data

```bash
# Restore from backup
gunzip -c /tmp/postgresql_20240115_020000.sql.gz | \
    psql -h $PGHOST -U $PGUSER -d novasight_restore
```

#### Step 5: Verify Restoration

```bash
psql -h $PGHOST -U $PGUSER -d novasight_restore << EOF
-- Check tenant count
SELECT COUNT(*) as tenant_count FROM tenants;

-- Check user count
SELECT COUNT(*) as user_count FROM users;

-- Check recent data
SELECT MAX(created_at) as latest_record FROM audit_logs;
EOF
```

#### Step 6: Swap Databases (During Maintenance Window)

```bash
# CAUTION: This will cause downtime
psql -h $PGHOST -U $PGUSER postgres << EOF
-- Terminate existing connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'novasight' AND pid <> pg_backend_pid();

-- Rename databases
ALTER DATABASE novasight RENAME TO novasight_old;
ALTER DATABASE novasight_restore RENAME TO novasight;
EOF

# Restart application pods
kubectl rollout restart deployment/backend -n novasight
```

### Using the Restore Script

```bash
# Restore latest backup
./backup/scripts/restore-postgresql.sh --latest --verify

# Restore specific backup to named database
./backup/scripts/restore-postgresql.sh \
    --backup postgresql_20240115_020000.sql.gz \
    --database novasight_restore \
    --verify

# Dry run
./backup/scripts/restore-postgresql.sh --latest --dry-run
```

---

## ClickHouse Recovery

### Full Restore

Restores the entire ClickHouse database from a backup.

#### Step 1: List Available Backups

```bash
# Using clickhouse-backup
clickhouse-backup list remote

# Or using restore script
./backup/scripts/restore-clickhouse.sh --list
```

#### Step 2: Download Backup

```bash
clickhouse-backup download backup_20240115_020000
```

#### Step 3: Restore

```bash
# Full restore (drops existing data)
clickhouse-backup restore --rm backup_20240115_020000

# Or restore specific tables only
clickhouse-backup restore --tables "analytics.*" backup_20240115_020000
```

#### Step 4: Verify Restoration

```bash
clickhouse-client --query "
SELECT 
    database,
    count() as table_count,
    sum(total_rows) as total_rows
FROM system.tables 
WHERE database NOT IN ('system', 'INFORMATION_SCHEMA', 'information_schema')
GROUP BY database
"
```

#### Step 5: Cleanup

```bash
# Remove local backup after successful restore
clickhouse-backup delete local backup_20240115_020000
```

### Using the Restore Script

```bash
# Restore latest backup
./backup/scripts/restore-clickhouse.sh --latest

# Restore specific backup
./backup/scripts/restore-clickhouse.sh --backup backup_20240115_020000

# Restore only specific tables
./backup/scripts/restore-clickhouse.sh \
    --backup backup_20240115_020000 \
    --tables "tenant_*"
```

---

## Redis Recovery

### Full Restore

Redis backups are RDB snapshots that can be restored by replacing the dump.rdb file.

#### Step 1: List Available Backups

```bash
aws s3 ls s3://novasight-backups/redis/
```

#### Step 2: Stop Redis (if running locally)

```bash
# In Kubernetes, scale down the deployment
kubectl scale deployment redis --replicas=0 -n novasight
```

#### Step 3: Download Backup

```bash
aws s3 cp s3://novasight-backups/redis/redis_20240115_120000.rdb /data/dump.rdb
```

#### Step 4: Verify Checksum

```bash
aws s3 cp s3://novasight-backups/redis/redis_20240115_120000.sha256 /tmp/
sha256sum -c /tmp/redis_20240115_120000.sha256
```

#### Step 5: Start Redis

```bash
# Scale back up
kubectl scale deployment redis --replicas=1 -n novasight

# Or restart locally
redis-server /etc/redis/redis.conf
```

#### Step 6: Verify

```bash
redis-cli -h redis-service INFO keyspace
```

---

## Tenant-Specific Recovery

For recovering data for a single tenant without affecting others.

### Using the Tenant Restore Script

```bash
# List tenants in a backup
./backup/scripts/restore-tenant.sh \
    --list-tenants \
    --backup postgresql_20240115_020000.sql.gz

# Restore specific tenant
./backup/scripts/restore-tenant.sh \
    --tenant-id "abc123-def456-ghi789" \
    --backup-date 20240115 \
    --verify

# Restore to specific schema
./backup/scripts/restore-tenant.sh \
    --tenant-id "abc123-def456-ghi789" \
    --backup-date 20240115 \
    --target-schema tenant_restore_review
```

### Manual Tenant Recovery

```bash
# 1. Download and extract backup
aws s3 cp s3://novasight-backups/postgresql/postgresql_20240115_020000.sql.gz /tmp/
gunzip /tmp/postgresql_20240115_020000.sql.gz

# 2. Create restore schema
psql -h $PGHOST -U $PGUSER -d novasight -c \
    "CREATE SCHEMA tenant_abc123_restore;"

# 3. Extract tenant data using grep/sed
# (This is a simplified example - use the script for production)
grep "abc123-def456-ghi789" /tmp/postgresql_20240115_020000.sql > /tmp/tenant_data.sql

# 4. Review and import
psql -h $PGHOST -U $PGUSER -d novasight -f /tmp/tenant_data.sql
```

---

## Post-Recovery Verification

### PostgreSQL Verification

```sql
-- Check table counts
SELECT schemaname, tablename, n_live_tup 
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC;

-- Check for orphaned records
SELECT t.id, t.name 
FROM tenants t 
LEFT JOIN users u ON t.id = u.tenant_id 
WHERE u.id IS NULL;

-- Verify foreign key integrity
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f' AND NOT convalidated;
```

### ClickHouse Verification

```sql
-- Check data consistency
SELECT 
    tenant_id,
    count() as record_count,
    min(event_time) as oldest,
    max(event_time) as newest
FROM analytics.events
GROUP BY tenant_id
ORDER BY record_count DESC;

-- Check for data gaps
SELECT 
    toDate(event_time) as date,
    count() as events
FROM analytics.events
GROUP BY date
ORDER BY date;
```

### Application Verification

```bash
# Check API health
curl -s http://localhost:5000/health | jq

# Run integration tests
pytest tests/integration/ -v

# Check for errors in logs
kubectl logs -l app=backend -n novasight --tail=100 | grep -i error
```

---

## Rollback Procedures

### If Recovery Fails

1. **Preserve the failed state** for investigation:
   ```bash
   pg_dump -h $PGHOST -U $PGUSER novasight_restore > /tmp/failed_restore_state.sql
   ```

2. **Drop the failed restore database**:
   ```bash
   psql -h $PGHOST -U $PGUSER -c "DROP DATABASE novasight_restore;"
   ```

3. **Retry with different backup** or investigate the issue.

### If Application Breaks After Swap

1. **Immediately swap back**:
   ```bash
   psql -h $PGHOST -U $PGUSER postgres << EOF
   ALTER DATABASE novasight RENAME TO novasight_failed;
   ALTER DATABASE novasight_old RENAME TO novasight;
   EOF
   ```

2. **Restart application**:
   ```bash
   kubectl rollout restart deployment/backend -n novasight
   ```

---

## Emergency Contacts

| Role                | Contact           | Notes                          |
|---------------------|-------------------|--------------------------------|
| On-Call DBA         | @dba-oncall       | Slack channel: #db-emergency   |
| Platform Team Lead  | @platform-lead    | For infrastructure issues      |
| Security Team       | @security         | If data breach suspected       |

---

## Appendix

### Environment Variables Reference

```bash
# PostgreSQL
export PGHOST=postgresql-service
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD=<from-secret>

# ClickHouse
export CLICKHOUSE_HOST=clickhouse-service
export CLICKHOUSE_PORT=9000
export CLICKHOUSE_USER=default
export CLICKHOUSE_PASSWORD=<from-secret>

# AWS/S3
export AWS_REGION=us-east-1
export S3_BUCKET=novasight-backups
```

### Useful Commands

```bash
# Check backup job status
kubectl get jobs -n novasight -l component=backup

# View backup job logs
kubectl logs job/postgresql-backup-manual-12345 -n novasight

# Trigger manual backup
kubectl create job --from=cronjob/postgresql-backup postgresql-backup-manual-$(date +%s) -n novasight

# Monitor S3 bucket size
aws s3 ls s3://novasight-backups/ --recursive --summarize | tail -2
```
