# API Reference

NovaSight provides a comprehensive REST API for programmatic access to all platform features.

## Overview

The API allows you to:
- Manage data sources and connections
- Execute queries
- Create and manage dashboards
- Manage users and permissions
- Access audit logs

**Base URL**: `https://api.novasight.io/v1`

---

## Authentication

### API Keys

Authenticate using API keys in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.novasight.io/v1/dashboards
```

### Getting an API Key

1. Go to **Settings** > **API Keys**
2. Click **Create API Key**
3. Set name, expiration, and scopes
4. Copy the key (shown only once)

### Scopes

| Scope | Description |
|-------|-------------|
| `read:dashboards` | View dashboards |
| `write:dashboards` | Create/edit dashboards |
| `read:queries` | View saved queries |
| `execute:queries` | Run queries |
| `read:datasources` | View data sources |
| `write:datasources` | Manage data sources |
| `admin:users` | Manage users |
| `admin:audit` | Access audit logs |

---

## Rate Limiting

| Tier | Limit |
|------|-------|
| Standard | 100 requests/minute |
| Premium | 500 requests/minute |
| Enterprise | Custom |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

---

## Endpoints

### Dashboards

#### List Dashboards

```http
GET /v1/dashboards
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 20, max: 100) |
| `search` | string | Search term |
| `folder_id` | string | Filter by folder |

**Response:**

```json
{
  "data": [
    {
      "id": "dash_abc123",
      "name": "Sales Overview",
      "description": "Monthly sales metrics",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T14:00:00Z",
      "owner": {
        "id": "user_xyz",
        "email": "alice@company.com"
      },
      "folder": {
        "id": "folder_123",
        "name": "Sales"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

#### Get Dashboard

```http
GET /v1/dashboards/{id}
```

**Response:**

```json
{
  "id": "dash_abc123",
  "name": "Sales Overview",
  "description": "Monthly sales metrics",
  "widgets": [
    {
      "id": "widget_1",
      "type": "kpi",
      "title": "Total Revenue",
      "query": "SELECT SUM(amount) FROM orders",
      "position": {"x": 0, "y": 0, "w": 4, "h": 2}
    }
  ],
  "filters": [
    {
      "id": "filter_1",
      "field": "date_range",
      "type": "date_range",
      "default": "last_30_days"
    }
  ],
  "settings": {
    "refresh_interval": 900,
    "theme": "light"
  }
}
```

#### Create Dashboard

```http
POST /v1/dashboards
```

**Request Body:**

```json
{
  "name": "New Dashboard",
  "description": "Dashboard description",
  "folder_id": "folder_123",
  "widgets": [],
  "filters": []
}
```

#### Update Dashboard

```http
PUT /v1/dashboards/{id}
```

#### Delete Dashboard

```http
DELETE /v1/dashboards/{id}
```

---

### Queries

#### Execute Query

```http
POST /v1/queries/execute
```

**Request Body:**

```json
{
  "type": "natural_language",
  "query": "Total sales by region last month",
  "datasource_id": "ds_abc123"
}
```

Or for SQL:

```json
{
  "type": "sql",
  "query": "SELECT region, SUM(amount) FROM orders GROUP BY region",
  "datasource_id": "ds_abc123"
}
```

**Response:**

```json
{
  "id": "query_xyz",
  "status": "completed",
  "execution_time_ms": 234,
  "columns": [
    {"name": "region", "type": "string"},
    {"name": "total", "type": "number"}
  ],
  "data": [
    {"region": "North", "total": 150000},
    {"region": "South", "total": 120000}
  ],
  "row_count": 2,
  "generated_sql": "SELECT region, SUM(amount) AS total FROM orders WHERE..."
}
```

#### Get Query Status

```http
GET /v1/queries/{id}
```

#### Cancel Query

```http
POST /v1/queries/{id}/cancel
```

---

### Data Sources

#### List Data Sources

```http
GET /v1/datasources
```

#### Get Data Source

```http
GET /v1/datasources/{id}
```

#### Create Data Source

```http
POST /v1/datasources
```

**Request Body:**

```json
{
  "name": "Production Database",
  "type": "postgresql",
  "connection": {
    "host": "db.example.com",
    "port": 5432,
    "database": "analytics",
    "username": "readonly_user",
    "password": "********",
    "ssl_mode": "require"
  }
}
```

#### Test Connection

```http
POST /v1/datasources/{id}/test
```

#### Sync Schema

```http
POST /v1/datasources/{id}/sync
```

---

### Semantic Layer

#### List Models

```http
GET /v1/semantic/models
```

#### Get Model

```http
GET /v1/semantic/models/{id}
```

#### Create Model

```http
POST /v1/semantic/models
```

**Request Body:**

```json
{
  "name": "Sales Analytics",
  "datasource_id": "ds_abc123",
  "tables": ["orders", "customers", "products"],
  "dimensions": [
    {
      "name": "Region",
      "field": "orders.region",
      "type": "string"
    }
  ],
  "measures": [
    {
      "name": "Total Sales",
      "expression": "SUM(orders.amount)",
      "format": "currency"
    }
  ]
}
```

---

### Users (Admin)

#### List Users

```http
GET /v1/admin/users
```

#### Create User

```http
POST /v1/admin/users
```

**Request Body:**

```json
{
  "email": "newuser@company.com",
  "first_name": "New",
  "last_name": "User",
  "role": "analyst",
  "send_invite": true
}
```

#### Update User

```http
PUT /v1/admin/users/{id}
```

#### Deactivate User

```http
POST /v1/admin/users/{id}/deactivate
```

---

### Audit Logs (Admin)

#### Query Audit Logs

```http
GET /v1/admin/audit
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `start_date` | datetime | Start of date range |
| `end_date` | datetime | End of date range |
| `user_id` | string | Filter by user |
| `action` | string | Filter by action type |
| `resource_type` | string | Filter by resource |

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_ERROR` | 401 | Invalid or missing API key |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Webhooks

### Configuring Webhooks

```http
POST /v1/webhooks
```

**Request Body:**

```json
{
  "url": "https://api.yourapp.com/novasight-webhook",
  "events": [
    "dashboard.created",
    "dashboard.updated",
    "query.completed",
    "user.created"
  ],
  "secret": "your_webhook_secret"
}
```

### Event Types

| Event | Description |
|-------|-------------|
| `dashboard.created` | Dashboard created |
| `dashboard.updated` | Dashboard modified |
| `dashboard.deleted` | Dashboard deleted |
| `query.completed` | Query execution finished |
| `datasource.sync_completed` | Schema sync finished |
| `user.created` | New user added |
| `user.login` | User logged in |

### Webhook Payload

```json
{
  "id": "evt_abc123",
  "type": "dashboard.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "dashboard": {
      "id": "dash_xyz",
      "name": "New Dashboard"
    }
  }
}
```

---

## SDKs

### Python

```python
from novasight import NovaSightClient

client = NovaSightClient(api_key="your_api_key")

# List dashboards
dashboards = client.dashboards.list()

# Execute query
result = client.queries.execute(
    type="natural_language",
    query="Total sales by region"
)
```

### JavaScript

```javascript
import { NovaSight } from '@novasight/sdk';

const client = new NovaSight({ apiKey: 'your_api_key' });

// List dashboards
const dashboards = await client.dashboards.list();

// Execute query
const result = await client.queries.execute({
  type: 'natural_language',
  query: 'Total sales by region'
});
```

---

## Next Steps

- [SQL Reference](sql-reference.md)
- [Keyboard Shortcuts](keyboard-shortcuts.md)
- [Troubleshooting](../troubleshooting/common-issues.md)
