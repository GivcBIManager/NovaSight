# Connecting to MySQL

This guide covers how to connect NovaSight to a MySQL database.

## Overview

MySQL is one of the world's most popular open-source databases. NovaSight supports MySQL 5.7 and above, as well as MariaDB 10.2+.

## Prerequisites

- [ ] MySQL server accessible from NovaSight
- [ ] Database credentials (username/password)
- [ ] Network access (firewall rules configured)
- [ ] (Optional) SSL certificate for secure connections

---

## Connection Steps

### Step 1: Navigate to Data Sources

1. Click **Data Sources** in the left sidebar
2. Click **+ Add Data Source**
3. Select **MySQL** from the list

### Step 2: Enter Connection Details

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Display name | `MySQL Production` |
| **Host** | Server hostname or IP | `mysql.example.com` |
| **Port** | MySQL port | `3306` (default) |
| **Database** | Database name | `analytics` |
| **Username** | Database user | `novasight_user` |
| **Password** | User password | `********` |

### Step 3: Configure SSL

Enable SSL for secure connections:

```yaml
SSL Options:
  Mode: REQUIRED  # or VERIFY_CA, VERIFY_IDENTITY
  CA Certificate: /path/to/ca.pem
  Client Certificate: /path/to/client-cert.pem  # Optional
  Client Key: /path/to/client-key.pem  # Optional
```

### Step 4: Advanced Options

```yaml
Connection:
  Connection Timeout: 30
  Read Timeout: 60
  Write Timeout: 60
  
Character Set: utf8mb4
Timezone: UTC

Pool:
  Min Connections: 1
  Max Connections: 10
```

### Step 5: Test and Save

1. Click **Test Connection**
2. Verify success message
3. Click **Save**

---

## Creating a Read-Only User

For security, create a dedicated read-only user:

```sql
-- Create user
CREATE USER 'novasight_readonly'@'%' IDENTIFIED BY 'secure_password';

-- Grant select permissions
GRANT SELECT ON analytics.* TO 'novasight_readonly'@'%';

-- Grant SHOW VIEW for view definitions
GRANT SHOW VIEW ON analytics.* TO 'novasight_readonly'@'%';

-- Apply changes
FLUSH PRIVILEGES;
```

!!! tip "IP Restriction"
    Replace `'%'` with specific IP addresses for better security:
    ```sql
    CREATE USER 'novasight_readonly'@'10.0.0.%' IDENTIFIED BY 'password';
    ```

---

## Supported Features

| Feature | Support |
|---------|---------|
| Basic queries | ✅ |
| Joins | ✅ |
| Aggregations | ✅ |
| Window functions | ✅ (MySQL 8.0+) |
| CTEs | ✅ (MySQL 8.0+) |
| JSON columns | ✅ |
| Full-text search | ✅ |
| Stored procedures | ❌ (read-only) |

---

## Troubleshooting

### Access Denied

```
Error: Access denied for user 'novasight'@'host'
```

**Solutions:**
1. Verify credentials
2. Check user grants: `SHOW GRANTS FOR 'novasight'@'%';`
3. Ensure host pattern matches

### Connection Timeout

**Solutions:**
1. Check `max_connections` setting
2. Verify firewall rules
3. Test network connectivity

### Character Encoding Issues

**Solutions:**
1. Set charset to `utf8mb4`
2. Verify database collation
3. Check client character set

---

## Next Steps

- [Sync Configuration](sync-configuration.md)
- [Connect to S3](connecting-s3.md)
- [Define Semantic Layer](../semantic-layer/dimensions-measures.md)
