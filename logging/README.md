# NovaSight Logging Infrastructure

Centralized structured logging with Loki/Promtail for log aggregation and Grafana for visualization.

## Overview

This logging infrastructure provides:

- **Structured JSON Logging**: All application logs in JSON format for easy parsing
- **Request Tracing**: Unique request IDs for correlating logs across services
- **Tenant Context**: Tenant and user IDs automatically included in logs
- **Centralized Aggregation**: Loki collects and stores logs from all services
- **Rich Querying**: LogQL for powerful log filtering and analysis
- **Visualization**: Grafana dashboards for log monitoring

## Components

### Backend Logger (`backend/app/utils/logger.py`)

```python
from app.utils.logger import get_logger

# Get a component-specific logger
logger = get_logger('datasource')

# Log with context
logger.info('Data source created', 
    datasource_id='uuid-here',
    type='postgresql',
    tenant_id='tenant-uuid'
)

# Log errors with stack trace
try:
    do_something()
except Exception as e:
    logger.exception('Operation failed', operation='create_datasource')

# Create a bound logger with persistent context
bound_logger = logger.with_context(datasource_id='uuid', type='postgresql')
bound_logger.info('Testing connection')  # Includes bound context
bound_logger.info('Connection successful')  # Still includes context
```

### Request Logging Middleware

Automatically logs all HTTP requests and responses:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "logger": "novasight.http",
  "message": "Request completed",
  "request_id": "a1b2c3d4",
  "tenant_id": "tenant-uuid",
  "user_id": "user-uuid",
  "method": "POST",
  "path": "/api/v1/datasources",
  "status_code": 201,
  "duration_ms": 45.23
}
```

## Quick Start

### Development (Docker Compose)

```bash
# Start main services
docker-compose up -d

# Start logging stack
docker-compose -f docker-compose.logging.yml up -d

# View logs in Grafana
open http://localhost:3001
# Login: admin / novasight
```

### Kubernetes

```bash
# Apply Loki
kubectl apply -f logging/loki/loki-deployment.yaml

# Apply Promtail
kubectl apply -f logging/promtail/promtail-daemonset.yaml

# Configure Grafana to use Loki datasource
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Minimum log level (DEBUG, INFO, WARNING, ERROR, CRITICAL) |
| `JSON_LOGS` | `true` | Enable JSON formatted logs (set to `false` for development) |

### Log Levels by Environment

| Environment | LOG_LEVEL | JSON_LOGS |
|-------------|-----------|-----------|
| Development | DEBUG | false (human-readable) |
| Testing | DEBUG | false |
| Production | INFO | true |

## Using Logs

### Pre-configured Loggers

```python
from app.utils.logger import (
    api_logger,      # API endpoints
    db_logger,       # Database operations
    auth_logger,     # Authentication
    query_logger,    # Query execution
    template_logger, # Template engine
    pipeline_logger, # Pipeline execution
    datasource_logger, # Data source operations
)

# Example usage
auth_logger.info('User login', user_id='uuid', method='password')
query_logger.info('Query executed', query_id='uuid', duration_ms=150)
```

### Adding Context

```python
# Request context is automatically added (request_id, tenant_id, user_id)
logger.info('Processing request')

# Add custom context
logger.info('Created resource', 
    resource_type='dashboard',
    resource_id='uuid',
    owner_id='user-uuid'
)
```

## Viewing Logs

### Grafana Dashboard

Access at `http://localhost:3001` (Docker) or your Grafana URL.

Dashboard features:
- Log volume over time by level
- Error rate trends
- Request latency distribution
- Tenant-specific logs
- Full-text log search

### LogQL Queries

See [LOGQL_QUERIES.md](./LOGQL_QUERIES.md) for common query examples.

Quick examples:
```logql
# All errors
{app="novasight"} | json | level="ERROR"

# Slow requests (>1s)
{app="novasight"} | json | duration_ms > 1000

# Logs for specific tenant
{app="novasight", tenant_id="<tenant-uuid>"}

# Trace a request
{app="novasight"} | json | request_id="a1b2c3d4"
```

## Security

### Sensitive Data

The logger automatically redacts sensitive fields:
- password, token, secret
- api_key, apikey, auth
- credential, private_key, authorization

```python
# These will be logged as [REDACTED]
logger.info('Connection created', password='secret123')  
# Output: {"password": "[REDACTED]", ...}
```

### Query String Sanitization

Sensitive query parameters are automatically redacted in request logs.

## Log Retention

| Environment | Retention |
|-------------|-----------|
| Development | 7 days |
| Production | 90 days |

Configure in `loki-config.yaml`:
```yaml
table_manager:
  retention_deletes_enabled: true
  retention_period: 2160h  # 90 days
```

## Troubleshooting

### Logs not appearing in Loki

1. Check Promtail is running: `docker logs novasight-promtail`
2. Verify Loki is healthy: `curl http://localhost:3100/ready`
3. Check container labels match scrape config

### JSON parsing errors

Ensure `JSON_LOGS=true` in production. Mixed format logs can cause issues.

### High log volume

1. Increase `LOG_LEVEL` (e.g., INFO instead of DEBUG)
2. Add rate limiting in Promtail config
3. Check for logging in hot paths

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Backend   │────>│  Promtail   │────>│    Loki     │
│   (JSON)    │     │ (collector) │     │  (storage)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
┌─────────────┐     ┌─────────────┐            │
│   Airflow   │────>│  Promtail   │────────────┤
│   Workers   │     │             │            │
└─────────────┘     └─────────────┘            │
                                               │
                                        ┌──────▼──────┐
                                        │   Grafana   │
                                        │ (dashboard) │
                                        └─────────────┘
```

## Files

```
logging/
├── README.md                  # This file
├── LOGQL_QUERIES.md          # Query reference
├── loki/
│   ├── loki-config.yaml      # Kubernetes config
│   ├── loki-local-config.yaml # Docker config
│   └── loki-deployment.yaml  # K8s manifests
├── promtail/
│   ├── promtail-config.yaml  # Kubernetes config
│   ├── promtail-docker-config.yaml # Docker config
│   └── promtail-daemonset.yaml # K8s manifests
└── grafana/
    ├── provisioning/
    │   ├── datasources/
    │   │   └── loki.yaml     # Loki datasource
    │   └── dashboards/
    │       └── default.yaml  # Dashboard provider
    └── dashboards/
        └── logs-dashboard.json # Main log dashboard

backend/app/
├── utils/
│   └── logger.py             # Structured logger
└── middleware/
    └── request_logging.py    # Request/response logging
```
