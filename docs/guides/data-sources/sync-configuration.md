# Data Sync Configuration

This guide explains how to configure data synchronization schedules for your data sources.

## Overview

NovaSight can automatically sync data from your sources on a schedule. This ensures your analytics are always up-to-date while managing resource usage efficiently.

---

## Sync Types

### 1. Metadata Sync

Refreshes schema information:
- Table and column definitions
- Relationships and constraints
- Statistics and row counts

**Use case:** When your database schema changes

### 2. Data Sync (for Caching)

Copies data to the analytics layer:
- Transfers data to ClickHouse
- Enables faster queries
- Supports incremental updates

**Use case:** For frequently queried datasets

### 3. Full Refresh

Complete data replacement:
- Truncates existing data
- Reloads all data from source
- Ensures data consistency

**Use case:** When data integrity is critical

---

## Configuring Sync Schedules

### Access Sync Settings

1. Go to **Data Sources**
2. Click on your data source
3. Navigate to **Sync** tab

### Schedule Options

#### Cron Expression

For precise control, use cron expressions:

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6)
│ │ │ │ │
* * * * *
```

**Examples:**

| Schedule | Cron Expression | Description |
|----------|-----------------|-------------|
| Every hour | `0 * * * *` | At minute 0 of every hour |
| Daily at 2 AM | `0 2 * * *` | Every day at 2:00 AM |
| Weekly | `0 2 * * 0` | Every Sunday at 2:00 AM |
| Every 15 min | `*/15 * * * *` | Every 15 minutes |

#### Preset Schedules

Choose from common presets:

- **Real-time**: Every 5 minutes
- **Frequent**: Every 15 minutes
- **Hourly**: Once per hour
- **Daily**: Once per day
- **Weekly**: Once per week
- **Manual**: On-demand only

---

## Incremental Sync

For large datasets, use incremental sync to only transfer changed data.

### Configuration

```yaml
Incremental Sync:
  Enabled: true
  Cursor Column: updated_at
  Cursor Type: timestamp
  Initial Sync: full  # or 'skip'
```

### Supported Cursor Types

| Type | Example | Best For |
|------|---------|----------|
| Timestamp | `updated_at` | Tables with modification timestamps |
| Integer | `id` | Auto-incrementing primary keys |
| Date | `created_date` | Date-partitioned tables |

### How It Works

1. **First sync**: Full table transfer
2. **Subsequent syncs**: Only rows where cursor > last value
3. **Cursor stored**: NovaSight tracks the last cursor value

!!! warning "Deletes"
    Incremental sync doesn't capture deleted rows. Use full refresh periodically if deletes are common.

---

## Table Selection

Choose which tables to sync:

```yaml
Tables:
  Include:
    - orders
    - customers
    - products
  
  Exclude:
    - user_sessions
    - audit_logs
    - temp_*
```

### Inclusion Patterns

| Pattern | Description |
|---------|-------------|
| `orders` | Exact table name |
| `sales_*` | Tables starting with "sales_" |
| `*_archive` | Tables ending with "_archive" |
| `public.*` | All tables in "public" schema |

---

## Sync Monitoring

### View Sync Status

1. Go to **Data Sources** > Your source
2. Click **Sync History**

### Status Indicators

| Status | Icon | Description |
|--------|------|-------------|
| Running | 🔄 | Sync in progress |
| Success | ✅ | Completed successfully |
| Failed | ❌ | Error occurred |
| Partial | ⚠️ | Some tables failed |
| Pending | ⏳ | Scheduled, not started |

### Sync Details

Click on any sync run to see:
- Start and end time
- Duration
- Rows transferred
- Tables synced
- Errors (if any)

---

## Error Handling

### Retry Policy

Configure automatic retries:

```yaml
Retry Policy:
  Max Retries: 3
  Retry Delay: 60s
  Backoff Multiplier: 2  # 60s, 120s, 240s
```

### Failure Notifications

Set up alerts for sync failures:

1. Go to **Settings** > **Notifications**
2. Enable **Sync Failure Alerts**
3. Configure channels:
   - Email
   - Slack
   - Webhook

---

## Best Practices

### Scheduling Tips

| Tip | Description |
|-----|-------------|
| **Off-peak hours** | Schedule large syncs during low-usage periods |
| **Stagger syncs** | Avoid running multiple large syncs simultaneously |
| **Match freshness needs** | Don't sync more often than necessary |

### Performance Tips

| Tip | Description |
|-----|-------------|
| **Use incremental** | For large tables, always use incremental sync |
| **Limit tables** | Only sync tables you actually need |
| **Optimize source** | Ensure source tables have proper indexes |

---

## Manual Sync

Trigger a sync manually:

1. Go to **Data Sources** > Your source
2. Click **Sync Now**
3. Choose sync type:
   - **Incremental**: Only new/changed data
   - **Full Refresh**: All data

---

## API Access

Trigger syncs programmatically:

```bash
# Trigger incremental sync
curl -X POST https://api.novasight.io/v1/datasources/{id}/sync \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "incremental"}'

# Check sync status
curl https://api.novasight.io/v1/datasources/{id}/sync/{sync_id} \
  -H "Authorization: Bearer $API_KEY"
```

---

## Next Steps

- [Define Semantic Layer](../semantic-layer/dimensions-measures.md)
- [Connect PostgreSQL](connecting-postgresql.md)
- [Connect MySQL](connecting-mysql.md)
