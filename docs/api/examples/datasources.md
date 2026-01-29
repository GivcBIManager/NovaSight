# Data Source Examples

This guide demonstrates how to manage data source connections in NovaSight.

## List Connections

Get all data connections for your tenant.

```bash
curl http://localhost:5000/api/v1/connections \
  -H "Authorization: Bearer <token>"
```

### Response

```json
{
  "connections": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Production Database",
      "db_type": "postgresql",
      "host": "db.example.com",
      "port": 5432,
      "database": "analytics",
      "username": "readonly_user",
      "ssl_mode": "require",
      "status": "active",
      "last_tested_at": "2026-01-29T10:30:00Z",
      "created_at": "2026-01-15T08:00:00Z",
      "updated_at": "2026-01-29T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1,
    "pages": 1
  }
}
```

## Create a Connection

Create a new database connection.

```bash
curl -X POST http://localhost:5000/api/v1/connections \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Staging Database",
    "db_type": "postgresql",
    "host": "staging-db.example.com",
    "port": 5432,
    "database": "analytics_staging",
    "username": "readonly_user",
    "password": "secret-password-here",
    "ssl_mode": "require"
  }'
```

### Response (201 Created)

```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "name": "Staging Database",
  "db_type": "postgresql",
  "host": "staging-db.example.com",
  "port": 5432,
  "database": "analytics_staging",
  "username": "readonly_user",
  "ssl_mode": "require",
  "status": "active",
  "created_at": "2026-01-29T14:00:00Z",
  "updated_at": "2026-01-29T14:00:00Z"
}
```

> **Note:** Passwords are encrypted before storage and never returned in API responses.

## Supported Database Types

| Type | Value | Default Port |
|------|-------|--------------|
| PostgreSQL | `postgresql` | 5432 |
| MySQL | `mysql` | 3306 |
| ClickHouse | `clickhouse` | 8123 |
| Oracle | `oracle` | 1521 |
| SQL Server | `sqlserver` | 1433 |

## Get Connection Details

```bash
curl http://localhost:5000/api/v1/connections/<connection-id> \
  -H "Authorization: Bearer <token>"
```

## Update a Connection

Update connection properties (partial update supported).

```bash
curl -X PATCH http://localhost:5000/api/v1/connections/<connection-id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Staging DB (Updated)",
    "password": "new-password"
  }'
```

## Test a Connection

Test connectivity without syncing data.

```bash
curl -X POST http://localhost:5000/api/v1/connections/<connection-id>/test \
  -H "Authorization: Bearer <token>"
```

### Response

```json
{
  "success": true,
  "message": "Connection successful",
  "latency_ms": 45.2
}
```

### Error Response

```json
{
  "success": false,
  "message": "Connection refused: timeout after 30 seconds",
  "latency_ms": null
}
```

## Get Database Schema

Introspect the connected database to discover tables and columns.

```bash
curl http://localhost:5000/api/v1/connections/<connection-id>/schema \
  -H "Authorization: Bearer <token>"
```

### Response

```json
{
  "tables": [
    {
      "name": "orders",
      "schema": "public",
      "type": "table",
      "row_count": 1500000,
      "columns": [
        {
          "name": "id",
          "type": "bigint",
          "nullable": false,
          "primary_key": true
        },
        {
          "name": "customer_id",
          "type": "bigint",
          "nullable": false,
          "primary_key": false
        },
        {
          "name": "order_date",
          "type": "timestamp",
          "nullable": false,
          "primary_key": false
        },
        {
          "name": "total_amount",
          "type": "decimal(10,2)",
          "nullable": false,
          "primary_key": false
        }
      ]
    },
    {
      "name": "customers",
      "schema": "public",
      "type": "table",
      "row_count": 50000,
      "columns": [
        {
          "name": "id",
          "type": "bigint",
          "nullable": false,
          "primary_key": true
        },
        {
          "name": "name",
          "type": "varchar(255)",
          "nullable": false,
          "primary_key": false
        },
        {
          "name": "email",
          "type": "varchar(255)",
          "nullable": false,
          "primary_key": false
        },
        {
          "name": "region",
          "type": "varchar(50)",
          "nullable": true,
          "primary_key": false
        }
      ]
    }
  ],
  "views": [
    {
      "name": "customer_orders",
      "schema": "public",
      "type": "view",
      "columns": [
        {"name": "customer_name", "type": "varchar(255)"},
        {"name": "order_count", "type": "bigint"},
        {"name": "total_spent", "type": "decimal(12,2)"}
      ]
    }
  ]
}
```

## Delete a Connection

⚠️ **Warning:** This permanently deletes the connection and all associated data.

```bash
curl -X DELETE http://localhost:5000/api/v1/connections/<connection-id> \
  -H "Authorization: Bearer <token>"
```

### Response (204 No Content)

Empty response on success.

## Connection with Extra Parameters

Some databases require additional connection parameters:

```bash
curl -X POST http://localhost:5000/api/v1/connections \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Oracle Production",
    "db_type": "oracle",
    "host": "oracle.example.com",
    "port": 1521,
    "database": "ORCL",
    "username": "analyst",
    "password": "secret-password",
    "extra_params": {
      "service_name": "analytics.example.com",
      "encoding": "UTF-8"
    }
  }'
```

## Error Handling

### Validation Error (400)

```json
{
  "success": false,
  "message": "Field 'host' is required",
  "code": "VALIDATION_ERROR"
}
```

### Connection Not Found (404)

```json
{
  "success": false,
  "message": "Connection not found",
  "code": "NOT_FOUND"
}
```

### Duplicate Name (409)

```json
{
  "success": false,
  "message": "A connection named 'Production Database' already exists",
  "code": "CONFLICT"
}
```

### Connection Test Failed (503)

```json
{
  "success": false,
  "message": "Unable to connect to database: Connection refused",
  "code": "CONNECTION_ERROR"
}
```
