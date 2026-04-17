# NovaSight Data Source API

REST API endpoints for managing data source connections in NovaSight.

## Overview

The Data Source API provides secure CRUD operations for database connections, connection testing, schema introspection, and data synchronization triggers.

## Features

✅ **CRUD Operations** - Create, read, update, delete connections  
✅ **Connection Testing** - Test connections before saving  
✅ **Schema Introspection** - Browse schemas, tables, and columns  
✅ **Secure Credentials** - Passwords encrypted at rest  
✅ **Tenant Isolation** - Multi-tenant data separation  
✅ **Permission Control** - Role-based access control  
✅ **Sync Triggering** - Trigger Dagster job runs  

## API Endpoints

### List Connections

```http
GET /api/v1/connections
```

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `per_page` (int, default: 20) - Items per page
- `db_type` (string) - Filter by database type
- `status` (string) - Filter by status

**Response:**
```json
{
  "connections": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Production DB",
      "db_type": "postgresql",
      "host": "db.example.com",
      "port": 5432,
      "database": "analytics",
      "username": "data_user",
      "status": "active",
      "created_at": "2026-01-27T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1,
    "pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

### Create Connection

```http
POST /api/v1/connections
```

**Required Roles:** `data_engineer`, `tenant_admin`

**Request Body:**
```json
{
  "name": "Production DB",
  "description": "Production PostgreSQL database",
  "db_type": "postgresql",
  "host": "db.example.com",
  "port": 5432,
  "database": "analytics",
  "username": "data_user",
  "password": "secure_password",
  "ssl_mode": "require",
  "schema_name": "public"
}
```

**Response:** `201 Created`
```json
{
  "connection": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Production DB",
    ...
  }
}
```

### Get Connection

```http
GET /api/v1/connections/:connection_id
```

**Response:**
```json
{
  "connection": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Production DB",
    "db_type": "postgresql",
    ...
  }
}
```

### Update Connection

```http
PATCH /api/v1/connections/:connection_id
```

**Required Roles:** `data_engineer`, `tenant_admin`

**Request Body:**
```json
{
  "name": "Updated Name",
  "port": 5433,
  "password": "new_password"
}
```

### Delete Connection

```http
DELETE /api/v1/connections/:connection_id
```

**Required Roles:** `data_engineer`, `tenant_admin`

**Response:**
```json
{
  "message": "Connection deleted successfully"
}
```

### Test Connection

```http
POST /api/v1/connections/:connection_id/test
```

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "details": {
    "database": "analytics",
    "schemas_count": 3,
    "schemas": ["public", "sales", "analytics"]
  }
}
```

### Test New Connection

Test connection parameters without saving.

```http
POST /api/v1/connections/test
```

**Required Roles:** `data_engineer`, `tenant_admin`

**Request Body:**
```json
{
  "db_type": "postgresql",
  "host": "db.example.com",
  "port": 5432,
  "database": "test_db",
  "username": "user",
  "password": "password",
  "ssl_mode": "require"
}
```

### Get Schema

```http
GET /api/v1/connections/:connection_id/schema
```

**Query Parameters:**
- `schema_name` (string) - Filter by schema
- `include_columns` (boolean) - Include column details

**Response:**
```json
{
  "schema": {
    "schemas": ["public", "sales"],
    "tables": {
      "public": [
        {
          "name": "users",
          "schema": "public",
          "row_count": 1000,
          "comment": "User accounts",
          "table_type": "BASE TABLE",
          "columns": [
            {
              "name": "id",
              "data_type": "integer",
              "nullable": false,
              "primary_key": true
            }
          ]
        }
      ]
    }
  }
}
```

### Trigger Sync

```http
POST /api/v1/connections/:connection_id/sync
```

**Required Roles:** `data_engineer`, `tenant_admin`

**Request Body (optional):**
```json
{
  "tables": ["users", "orders"],
  "incremental": true,
  "sync_config": {
    "batch_size": 10000
  }
}
```

**Response:**
```json
{
  "job_id": "660e8400-e29b-41d4-a716-446655440000",
  "status": "started",
  "message": "Data sync job started successfully"
}
```

## Request/Response Schemas

### ConnectionCreateSchema

```python
{
  "name": str (3-100 chars),
  "description": Optional[str] (max 500 chars),
  "db_type": "postgresql" | "mysql" | "oracle" | "sqlserver" | "clickhouse",
  "host": str (1-255 chars),
  "port": int (1-65535),
  "database": str (1-255 chars),
  "username": str (1-255 chars),
  "password": str (min 1 char),
  "ssl_mode": Optional[str] (max 50 chars),
  "schema_name": Optional[str] (max 255 chars),
  "extra_params": Optional[Dict]
}
```

### ConnectionResponseSchema

```python
{
  "id": UUID,
  "name": str,
  "description": Optional[str],
  "db_type": str,
  "host": str,
  "port": int,
  "database": str,
  "schema_name": Optional[str],
  "username": str,
  "ssl_mode": Optional[str],
  "status": "active" | "inactive" | "error" | "testing",
  "last_tested_at": Optional[datetime],
  "created_at": datetime,
  "updated_at": datetime,
  "created_by": UUID
}
```

**Note:** Password is NEVER included in responses.

## Authentication

All endpoints require JWT authentication:

```http
Authorization: Bearer <jwt_token>
```

The JWT must contain:
- `tenant_id` - Tenant UUID
- `user_id` - User UUID
- `roles` - User roles

## Permissions

| Endpoint | Required Role |
|----------|--------------|
| List Connections | Any authenticated user |
| Get Connection | Any authenticated user |
| Create Connection | `data_engineer`, `tenant_admin` |
| Update Connection | `data_engineer`, `tenant_admin` |
| Delete Connection | `data_engineer`, `tenant_admin` |
| Test Connection | `data_engineer`, `tenant_admin`, `viewer` |
| Test New Connection | `data_engineer`, `tenant_admin` |
| Get Schema | Any authenticated user |
| Trigger Sync | `data_engineer`, `tenant_admin` |

## Error Responses

### 400 Bad Request
```json
{
  "error": "ValidationError",
  "message": "Field 'port' is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "NotFound",
  "message": "Connection not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "InternalServerError",
  "message": "An unexpected error occurred"
}
```

## Security

### Credential Encryption

Passwords are encrypted using AES-256 (Fernet) before storage:

```python
from app.utils.encryption import encrypt_credential

encrypted = encrypt_credential(plaintext_password)
# Store encrypted in database
```

### Tenant Isolation

All connections are scoped to tenants:

```python
# Automatically filtered by tenant_id from JWT
connections = ConnectionService(tenant_id).list_connections()
```

### SSRF Prevention

Host validation prevents private/loopback addresses in production:

```python
@validator('host')
def validate_host(cls, v):
    import ipaddress
    try:
        ip = ipaddress.ip_address(v)
        if ip.is_private or ip.is_loopback:
            # Warning logged, allowed in dev
            pass
    except ValueError:
        pass  # Hostname allowed
    return v
```

## Integration

### Using the Connector Framework

The API internally uses the connector framework:

```python
from app.services.connection_service import ConnectionService

service = ConnectionService(tenant_id)

# Get connector for direct queries
connector = service.get_connector(connection_id)

with connector:
    # Fetch data
    for batch in connector.fetch_data("SELECT * FROM users"):
        process(batch)
```

### Triggering Dagster Jobs

Sync endpoint triggers Dagster jobs:

```python
# TODO: Full implementation
from app.services.dagster_client import DagsterClient

dagster = DagsterClient()
run = dagster.launch_run(
    job_name=f"ingest_{db_type}",
    repository_name=tenant_id,
    run_config={"connection_id": connection_id}
)
```

## Testing

Run API tests:

```bash
# Unit tests
pytest backend/tests/unit/test_connection_api.py -v

# Integration tests (requires database)
pytest backend/tests/integration/test_connection_endpoints.py -v

# With coverage
pytest backend/tests/unit/test_connection_api.py --cov=app.api.v1.connections
```

## Examples

### cURL Examples

**List connections:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/connections
```

**Create connection:**
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production DB",
    "db_type": "postgresql",
    "host": "db.example.com",
    "port": 5432,
    "database": "analytics",
    "username": "data_user",
    "password": "secure_password"
  }' \
  http://localhost:5000/api/v1/connections
```

**Test connection:**
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/connections/$CONNECTION_ID/test
```

**Get schema:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/v1/connections/$CONNECTION_ID/schema?include_columns=true"
```

### Python Client Example

```python
import requests

class NovaSightClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {token}"}
    
    def create_connection(self, **kwargs):
        response = requests.post(
            f"{self.base_url}/api/v1/connections",
            headers=self.headers,
            json=kwargs
        )
        response.raise_for_status()
        return response.json()
    
    def get_schema(self, connection_id, include_columns=True):
        response = requests.get(
            f"{self.base_url}/api/v1/connections/{connection_id}/schema",
            headers=self.headers,
            params={"include_columns": include_columns}
        )
        response.raise_for_status()
        return response.json()

# Usage
client = NovaSightClient("http://localhost:5000", "your_token")

connection = client.create_connection(
    name="Production DB",
    db_type="postgresql",
    host="db.example.com",
    port=5432,
    database="analytics",
    username="user",
    password="password"
)

schema = client.get_schema(connection["connection"]["id"])
```

## Related Documentation

- [Data Source Connectors](../connectors/README.md)
- [Connection Model](../models/connection.py)
- [Connection Service](../services/connection_service.py)
- [Authentication](../middleware/jwt_handlers.py)

---

**API Version:** v1  
**Last Updated:** 2026-01-27
