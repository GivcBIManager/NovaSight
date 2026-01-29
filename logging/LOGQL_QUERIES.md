# NovaSight LogQL Queries Reference
# ==================================
# Useful Loki LogQL queries for monitoring and debugging

## Basic Queries

### All logs from NovaSight backend
```logql
{app="novasight", service="backend"}
```

### Error logs only
```logql
{app="novasight"} | json | level="ERROR"
```

### Logs from specific tenant
```logql
{app="novasight", tenant_id="<tenant-uuid>"}
```

### Logs with specific request ID
```logql
{app="novasight"} | json | request_id="<request-id>"
```

---

## Request Monitoring

### All HTTP requests
```logql
{app="novasight"} | json | message =~ "Request.*"
```

### Slow requests (> 1 second)
```logql
{app="novasight"} | json | message="Request completed" | duration_ms > 1000
```

### Failed requests (5xx errors)
```logql
{app="novasight"} | json | status_code >= 500
```

### Requests by endpoint
```logql
{app="novasight"} | json | path="/api/v1/datasources"
```

### Request rate by status code
```logql
sum by (status_code) (
  count_over_time({app="novasight"} | json | message="Request completed" [5m])
)
```

---

## Authentication & Security

### Failed authentication attempts
```logql
{app="novasight"} |= "authentication" |= "failed"
```

### Login events
```logql
{app="novasight"} | json | logger="novasight.auth" | message =~ ".*login.*"
```

### Permission denied events
```logql
{app="novasight"} |= "permission" |= "denied"
```

### Token events
```logql
{app="novasight"} | json | logger="novasight.auth" | message =~ ".*token.*"
```

---

## Data Sources & Connections

### Data source operations
```logql
{app="novasight"} | json | logger="novasight.datasource"
```

### Connection test logs
```logql
{app="novasight"} |= "test connection"
```

### Schema introspection
```logql
{app="novasight"} |= "introspect" or |= "schema"
```

---

## Query Execution

### All query executions
```logql
{app="novasight"} | json | logger="novasight.query"
```

### Slow queries (> 5 seconds)
```logql
{app="novasight"} | json | logger="novasight.query" | duration_ms > 5000
```

### Query errors
```logql
{app="novasight"} | json | logger="novasight.query" | level="ERROR"
```

---

## Template Engine

### Template generation logs
```logql
{app="novasight"} | json | logger="novasight.template"
```

### Template validation errors
```logql
{app="novasight"} | json | logger="novasight.template" | level="ERROR"
```

### PySpark template generation
```logql
{app="novasight"} |= "pyspark" |= "template"
```

### DAG generation
```logql
{app="novasight"} |= "dag" |= "generat"
```

---

## Pipeline Execution

### Pipeline logs
```logql
{app="novasight"} | json | logger="novasight.pipeline"
```

### Pipeline failures
```logql
{app="novasight"} | json | logger="novasight.pipeline" | level="ERROR"
```

---

## Airflow Logs

### All Airflow logs
```logql
{app="novasight", service=~"airflow.*"}
```

### Airflow scheduler
```logql
{app="novasight", service="airflow-scheduler"}
```

### Airflow worker
```logql
{app="novasight", service="airflow-worker"}
```

### DAG execution errors
```logql
{app="novasight", service=~"airflow.*"} |= "ERROR"
```

---

## Aggregation Queries

### Error count by logger
```logql
sum by (logger) (
  count_over_time({app="novasight"} | json | level="ERROR" [1h])
)
```

### Request count by endpoint
```logql
sum by (path) (
  count_over_time({app="novasight"} | json | message="Request completed" [1h])
)
| sort desc
```

### Average response time by endpoint
```logql
avg by (path) (
  avg_over_time({app="novasight"} | json | message="Request completed" | unwrap duration_ms [1h])
)
```

### Requests per tenant
```logql
sum by (tenant_id) (
  count_over_time({app="novasight"} | json | message="Request completed" [1h])
)
```

### Logs volume by level
```logql
sum by (level) (
  bytes_over_time({app="novasight"} [1h])
)
```

---

## Alerting Queries (for Grafana)

### High error rate alert
```logql
sum(count_over_time({app="novasight"} | json | level="ERROR" [5m])) > 10
```

### Slow request alert
```logql
count(
  {app="novasight"} | json | message="Request completed" | duration_ms > 5000
) > 5
```

### No logs alert (service down)
```logql
absent_over_time({app="novasight", service="backend"}[5m])
```

---

## Tips

1. Use `| json` after stream selector to parse JSON logs
2. Use `| line_format` to format output for readability
3. Use `| unwrap` to convert label values to numeric for aggregations
4. Combine labels with `|=` for simple text matching
5. Use regex with `=~` for pattern matching
6. Add `| logfmt` for key=value formatted logs
