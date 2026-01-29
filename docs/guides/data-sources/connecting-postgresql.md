# Connecting to PostgreSQL

This guide covers how to connect NovaSight to a PostgreSQL database.

## Overview

PostgreSQL is a powerful, open-source relational database. NovaSight fully supports PostgreSQL versions 11 and above.

## Prerequisites

Before connecting, ensure you have:

- [ ] PostgreSQL server accessible from NovaSight
- [ ] Database credentials (username/password)
- [ ] Network access (firewall rules configured)
- [ ] (Optional) SSL certificate for secure connections

---

## Connection Steps

### Step 1: Navigate to Data Sources

1. Click **Data Sources** in the left sidebar
2. Click **+ Add Data Source**
3. Select **PostgreSQL** from the list

### Step 2: Enter Connection Details

Fill in the connection form:

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Display name for this connection | `Production Database` |
| **Host** | Server hostname or IP | `db.example.com` |
| **Port** | PostgreSQL port | `5432` (default) |
| **Database** | Database name | `analytics` |
| **Username** | Database user | `novasight_readonly` |
| **Password** | User password | `********` |

### Step 3: Configure SSL (Recommended)

For production connections, enable SSL:

| SSL Mode | Description |
|----------|-------------|
| `disable` | No SSL (not recommended) |
| `require` | SSL required, no verification |
| `verify-ca` | Verify server certificate |
| `verify-full` | Verify certificate and hostname |

!!! warning "Security"
    Always use `verify-ca` or `verify-full` for production databases.

**To upload SSL certificates:**

1. Enable **Use SSL**
2. Upload files:
   - **CA Certificate**: Root certificate
   - **Client Certificate**: (if using mutual TLS)
   - **Client Key**: (if using mutual TLS)

### Step 4: Advanced Options

Expand **Advanced Options** for additional settings:

```yaml
Connection Pool:
  Min Connections: 1
  Max Connections: 10
  Connection Timeout: 30s
  Idle Timeout: 300s

Query Options:
  Statement Timeout: 60s
  Read Only: true  # Recommended
  
Schemas:
  Include: ["public", "analytics"]
  Exclude: ["pg_*", "information_schema"]
```

### Step 5: Test and Save

1. Click **Test Connection**
2. Wait for the connection test to complete
3. If successful, click **Save**

---

## Schema Introspection

After connecting, NovaSight automatically discovers:

- **Schemas**: Available database schemas
- **Tables**: Tables and views
- **Columns**: Column names, types, and constraints
- **Relationships**: Foreign key relationships
- **Statistics**: Row counts and data distribution

### View Schema

1. Click on your data source
2. Browse the schema tree:
   ```
   production-db/
   ├── public/
   │   ├── customers
   │   ├── orders
   │   └── products
   └── analytics/
       ├── daily_sales
       └── customer_segments
   ```
3. Click any table to preview data

### Refresh Schema

If your database schema changes:

1. Click on the data source
2. Click **Refresh Schema**
3. Wait for introspection to complete

---

## Connection String Format

NovaSight uses the following connection string format internally:

```
postgresql://username:password@host:port/database?sslmode=require
```

**Example:**
```
postgresql://novasight:secret@db.example.com:5432/analytics?sslmode=verify-full
```

---

## Best Practices

### Security

| Practice | Description |
|----------|-------------|
| **Read-only user** | Create a dedicated read-only user for NovaSight |
| **Least privilege** | Grant only necessary permissions |
| **SSL encryption** | Always use SSL in production |
| **IP allowlisting** | Restrict database access by IP |

### Creating a Read-Only User

Run this SQL on your PostgreSQL server:

```sql
-- Create role
CREATE ROLE novasight_readonly WITH LOGIN PASSWORD 'secure_password';

-- Grant connect
GRANT CONNECT ON DATABASE analytics TO novasight_readonly;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO novasight_readonly;
GRANT USAGE ON SCHEMA analytics TO novasight_readonly;

-- Grant select on all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO novasight_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO novasight_readonly;

-- Grant for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT ON TABLES TO novasight_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics 
  GRANT SELECT ON TABLES TO novasight_readonly;
```

### Performance

| Tip | Description |
|-----|-------------|
| **Indexes** | Ensure proper indexes on frequently queried columns |
| **Connection pooling** | Use appropriate pool size (5-10 for most cases) |
| **Query timeout** | Set reasonable timeouts to prevent runaway queries |
| **Read replicas** | Connect to read replicas for analytics workloads |

---

## Troubleshooting

### Connection Refused

```
Error: Connection refused to host:5432
```

**Solutions:**
1. Check if PostgreSQL is running: `pg_isready -h host -p 5432`
2. Verify firewall allows connections
3. Check `pg_hba.conf` allows your IP
4. Ensure PostgreSQL is listening on the correct interface

### Authentication Failed

```
Error: password authentication failed for user "novasight"
```

**Solutions:**
1. Verify username and password
2. Check user exists: `SELECT usename FROM pg_user;`
3. Verify `pg_hba.conf` authentication method

### SSL Connection Error

```
Error: SSL connection is required
```

**Solutions:**
1. Enable SSL in connection settings
2. Upload correct CA certificate
3. Verify SSL mode matches server requirements

### Timeout Errors

```
Error: Connection timed out
```

**Solutions:**
1. Check network connectivity
2. Increase connection timeout
3. Verify no network proxy is blocking

---

## Supported Features

| Feature | Support |
|---------|---------|
| Basic queries | ✅ |
| Joins | ✅ |
| Aggregations | ✅ |
| Window functions | ✅ |
| CTEs | ✅ |
| JSON/JSONB | ✅ |
| Arrays | ✅ |
| Full-text search | ✅ |
| Materialized views | ✅ |
| Partitioned tables | ✅ |

---

## Next Steps

- [Configure Sync Schedule](sync-configuration.md)
- [Define Semantic Layer](../semantic-layer/dimensions-measures.md)
- [Connect MySQL](connecting-mysql.md)
