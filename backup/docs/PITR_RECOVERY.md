# Point-in-Time Recovery (PITR) for PostgreSQL

## Overview

Point-in-Time Recovery allows restoring the PostgreSQL database to any specific moment in time, not just to when a backup was taken. This is achieved by combining base backups with Write-Ahead Log (WAL) archiving.

## How PITR Works

```
Timeline:
|---Base Backup---|----WAL Files----|----WAL Files----|
    (6 hours ago)   (continuous)      (continuous)
                                              ^
                                     Target Recovery Point
```

1. **Base Backup**: Full database dump taken every 6 hours
2. **WAL Archiving**: Continuous streaming of transaction logs to S3
3. **Recovery**: Restore base backup + replay WAL files up to target time

## Prerequisites

### PostgreSQL Configuration

The following settings must be enabled (configured in `wal-archiver.yaml`):

```sql
-- Check current settings
SHOW wal_level;        -- Should be 'replica' or 'logical'
SHOW archive_mode;     -- Should be 'on'
SHOW archive_command;  -- Should point to archive script
```

### Required Files in S3

```
s3://novasight-backups/
├── postgresql/
│   ├── postgresql_20240115_020000.sql.gz  # Base backup
│   └── wal/
│       ├── 000000010000000000000001.gz    # WAL files
│       ├── 000000010000000000000002.gz
│       └── ...
```

## Recovery Procedure

### Step 1: Identify Recovery Target

Determine the exact time you want to recover to:

```bash
# Example: Recover to 10:30 AM on January 15, 2024
TARGET_TIME="2024-01-15 10:30:00"
```

### Step 2: Find Appropriate Base Backup

Find the most recent base backup BEFORE your target time:

```bash
# List backups
aws s3 ls s3://novasight-backups/postgresql/ | grep -E '\.sql\.gz$' | sort

# Choose the backup taken before your target time
BASE_BACKUP="postgresql_20240115_020000.sql.gz"  # 2 AM backup
```

### Step 3: List Available WAL Files

```bash
# List WAL files between backup time and target time
aws s3 ls s3://novasight-backups/postgresql/wal/ | \
    awk '$1 >= "2024-01-15" && $2 >= "02:00:00" && $2 <= "10:30:00"'
```

### Step 4: Prepare Recovery Environment

```bash
# Create recovery directory
mkdir -p /var/lib/postgresql/recovery
cd /var/lib/postgresql/recovery

# Download base backup
aws s3 cp s3://novasight-backups/postgresql/${BASE_BACKUP} .
gunzip ${BASE_BACKUP}

# Download all WAL files from backup time to target time
aws s3 sync s3://novasight-backups/postgresql/wal/ ./wal/ \
    --exclude "*" \
    --include "*.gz"

# Decompress WAL files
cd wal && gunzip *.gz && cd ..
```

### Step 5: Initialize Recovery Database

```bash
# Stop existing PostgreSQL if running
pg_ctl stop -D /var/lib/postgresql/data

# Create new data directory
initdb -D /var/lib/postgresql/recovery_data

# Restore base backup
psql -d postgres -f postgresql_20240115_020000.sql
```

### Step 6: Configure Recovery

Create `recovery.conf` (PostgreSQL < 12) or `postgresql.conf` settings (PostgreSQL >= 12):

```bash
# For PostgreSQL 12+
cat >> /var/lib/postgresql/recovery_data/postgresql.conf << EOF
restore_command = 'cp /var/lib/postgresql/recovery/wal/%f %p'
recovery_target_time = '2024-01-15 10:30:00 UTC'
recovery_target_action = 'promote'
EOF

# Create recovery signal file
touch /var/lib/postgresql/recovery_data/recovery.signal
```

### Step 7: Start Recovery

```bash
# Start PostgreSQL in recovery mode
pg_ctl start -D /var/lib/postgresql/recovery_data -l recovery.log

# Monitor recovery progress
tail -f recovery.log
```

### Step 8: Verify Recovery

```bash
# Check recovery status
psql -c "SELECT pg_is_in_recovery();"

# Should return 'f' (false) after recovery completes

# Verify data
psql << EOF
SELECT COUNT(*) FROM users;
SELECT MAX(created_at) FROM audit_logs;
-- Should show data up to your target time
EOF
```

### Step 9: Promote to Primary

If recovery completes successfully:

```bash
# PostgreSQL 12+: Happens automatically with recovery_target_action = 'promote'
# Or manually:
pg_ctl promote -D /var/lib/postgresql/recovery_data
```

## Using the Backup Service API

```python
from datetime import datetime
from app.services.backup_service import PointInTimeRecovery

pitr = PointInTimeRecovery()

# Get available recovery points
start = datetime(2024, 1, 15, 2, 0, 0)
end = datetime(2024, 1, 15, 10, 30, 0)
points = pitr.get_recovery_points(start, end)

print(f"Found {len(points)} recovery points")

# Initiate recovery
result = pitr.initiate_recovery(
    target_time=datetime(2024, 1, 15, 10, 30, 0),
    target_database='novasight_pitr_restore'
)

print(f"Recovery job: {result['job_name']}")
```

## Common Scenarios

### Scenario 1: Accidental Data Deletion

```bash
# User deleted important data at 10:45 AM
# Recover to 10:44 AM

TARGET_TIME="2024-01-15 10:44:00"
./scripts/pitr-recover.sh --target-time "${TARGET_TIME}"
```

### Scenario 2: Bad Migration

```bash
# Migration ran at 3:00 PM and corrupted data
# Recover to 2:59 PM (before migration)

TARGET_TIME="2024-01-15 14:59:00"
./scripts/pitr-recover.sh --target-time "${TARGET_TIME}"
```

### Scenario 3: Extract Specific Record

```bash
# Need to see what a specific record looked like at a point in time
# Recover to temporary database, query, then drop

TARGET_TIME="2024-01-15 09:00:00"
./scripts/pitr-recover.sh \
    --target-time "${TARGET_TIME}" \
    --database temp_lookup

# Query the data
psql -d temp_lookup -c "SELECT * FROM users WHERE id = 'xyz';"

# Cleanup
dropdb temp_lookup
```

## Troubleshooting

### WAL Files Not Found

```bash
# Check if WAL archiving is working
psql -c "SELECT * FROM pg_stat_archiver;"

# Check archive_command status
tail -f /var/log/postgresql/postgresql.log | grep archive
```

### Recovery Takes Too Long

```bash
# Check recovery progress
psql -c "SELECT * FROM pg_stat_recovery_prefetch;"

# Increase recovery performance
# Add to postgresql.conf:
max_wal_size = 4GB
maintenance_work_mem = 2GB
```

### Recovery Fails

```bash
# Check error logs
tail -100 /var/lib/postgresql/recovery_data/log/postgresql.log

# Common issues:
# 1. Missing WAL file - check S3 for gaps
# 2. Corrupted WAL - verify checksums
# 3. Target time before base backup - use earlier base backup
```

## Limitations

1. **Recovery Point Objective (RPO)**: Limited by WAL archive frequency (usually ~5 minutes)
2. **Recovery Time Objective (RTO)**: Depends on data size and WAL replay time
3. **Storage**: WAL files can consume significant S3 storage
4. **Cannot recover to time before oldest base backup + WAL**

## Best Practices

1. **Test regularly**: Perform recovery drills monthly
2. **Monitor WAL archiving**: Alert if archiving falls behind
3. **Keep sufficient history**: 7 days of WAL files minimum
4. **Document target times**: Keep notes of when major changes occur
5. **Use transactions**: Ensure proper transaction boundaries for clean recovery points

## Related Documentation

- [Recovery Runbook](./RECOVERY_RUNBOOK.md)
- [PostgreSQL Backup CronJob](../postgresql/backup-cronjob.yaml)
- [WAL Archiver Configuration](../postgresql/wal-archiver.yaml)
