# Monitoring Setup

This guide covers setting up monitoring, logging, and alerting for NovaSight.

## Overview

NovaSight uses a comprehensive observability stack:

| Component | Purpose |
|-----------|---------|
| **Prometheus** | Metrics collection and storage |
| **Grafana** | Visualization and dashboards |
| **Loki** | Log aggregation |
| **Promtail** | Log shipping |
| **Alertmanager** | Alert routing and notifications |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Observability Stack                           │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Grafana   │  │ Alertmanager│  │   PagerDuty │              │
│  │ Dashboards  │  │   Routing   │──│   Slack     │              │
│  └──────┬──────┘  └──────┬──────┘  │   Email     │              │
│         │                │         └─────────────┘              │
│         │                │                                       │
│  ┌──────┴──────┐  ┌──────┴──────┐                               │
│  │ Prometheus  │  │    Loki     │                               │
│  │  Metrics    │  │    Logs     │                               │
│  └──────┬──────┘  └──────┬──────┘                               │
│         │                │                                       │
│         │         ┌──────┴──────┐                               │
│         │         │  Promtail   │                               │
│         │         │ Log Shipper │                               │
│         │         └──────┬──────┘                               │
└─────────┼────────────────┼──────────────────────────────────────┘
          │                │
┌─────────┴────────────────┴──────────────────────────────────────┐
│                    NovaSight Application                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Backend    │  │   Frontend   │  │   Workers    │          │
│  │  /metrics    │  │              │  │  /metrics    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Prometheus Setup

### ServiceMonitor for Backend

```yaml
# monitoring/prometheus/service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: novasight-backend
  namespace: novasight
  labels:
    app: novasight
spec:
  selector:
    matchLabels:
      app: novasight-backend
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
      scrapeTimeout: 10s
  namespaceSelector:
    matchNames:
      - novasight
```

### PrometheusRule for Alerts

```yaml
# monitoring/prometheus/alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: novasight-alerts
  namespace: novasight
spec:
  groups:
    - name: novasight.rules
      rules:
        # High Error Rate
        - alert: HighErrorRate
          expr: |
            sum(rate(http_requests_total{status=~"5..", app="novasight-backend"}[5m])) 
            / 
            sum(rate(http_requests_total{app="novasight-backend"}[5m])) > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: High error rate detected
            description: Error rate is {{ $value | humanizePercentage }} for the last 5 minutes
        
        # High Latency
        - alert: HighLatency
          expr: |
            histogram_quantile(0.95, 
              sum(rate(http_request_duration_seconds_bucket{app="novasight-backend"}[5m])) by (le)
            ) > 2
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: High latency detected
            description: 95th percentile latency is {{ $value | humanizeDuration }}
        
        # Pod Not Ready
        - alert: PodNotReady
          expr: |
            kube_pod_status_ready{namespace="novasight", condition="true"} == 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: Pod {{ $labels.pod }} is not ready
        
        # High Memory Usage
        - alert: HighMemoryUsage
          expr: |
            container_memory_usage_bytes{namespace="novasight"} 
            / 
            container_spec_memory_limit_bytes{namespace="novasight"} > 0.9
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: High memory usage on {{ $labels.pod }}
            description: Memory usage is {{ $value | humanizePercentage }}
        
        # Database Connection Issues
        - alert: DatabaseConnectionErrors
          expr: |
            sum(rate(sqlalchemy_pool_checkout_errors_total{app="novasight-backend"}[5m])) > 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: Database connection errors detected
        
        # ClickHouse Query Errors
        - alert: ClickHouseQueryErrors
          expr: |
            sum(rate(clickhouse_queries_failed_total{app="novasight-backend"}[5m])) > 5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: ClickHouse query errors increasing
```

## Grafana Dashboards

### Application Dashboard

```json
{
  "dashboard": {
    "title": "NovaSight Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{app=\"novasight-backend\"}[5m])) by (method, endpoint)",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{app=\"novasight-backend\", status=~\"5..\"}[5m])) / sum(rate(http_requests_total{app=\"novasight-backend\"}[5m])) * 100"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {"value": 0, "color": "green"},
                {"value": 1, "color": "yellow"},
                {"value": 5, "color": "red"}
              ]
            }
          }
        }
      },
      {
        "title": "Latency (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{app=\"novasight-backend\"}[5m])) by (le, endpoint))",
            "legendFormat": "{{endpoint}}"
          }
        ]
      },
      {
        "title": "Active Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(sqlalchemy_pool_size{app=\"novasight-backend\"}) - sum(sqlalchemy_pool_available{app=\"novasight-backend\"})"
          }
        ]
      }
    ]
  }
}
```

### Key Metrics to Monitor

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `http_requests_total` | Request count by status | Error rate > 5% |
| `http_request_duration_seconds` | Request latency | p95 > 2s |
| `sqlalchemy_pool_size` | DB connection pool | Available < 2 |
| `clickhouse_queries_total` | ClickHouse queries | Errors > 5/min |
| `celery_tasks_total` | Background task count | Failed > 10% |
| `ollama_requests_total` | AI query count | Latency > 30s |

## Logging with Loki

### Promtail Configuration

```yaml
# logging/promtail/config.yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    
    relabel_configs:
      - source_labels: [__meta_kubernetes_namespace]
        regex: novasight
        action: keep
      
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: app
      
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
    
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: message
            timestamp: timestamp
            trace_id: trace_id
      
      - labels:
          level:
          trace_id:
      
      - timestamp:
          source: timestamp
          format: RFC3339Nano
```

### Log Queries (LogQL)

```logql
# All errors in the last hour
{app="novasight-backend"} |= "ERROR"

# Slow queries (over 1 second)
{app="novasight-backend"} | json | duration > 1s

# Failed authentication attempts
{app="novasight-backend"} | json | message =~ "authentication failed"

# Queries by tenant
{app="novasight-backend"} | json | tenant_id="acme"

# Trace a specific request
{app=~"novasight-.*"} | json | trace_id="abc123"
```

## Alertmanager Configuration

```yaml
# monitoring/alertmanager/config.yaml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/xxx'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
    
    - match:
        severity: warning
      receiver: 'slack'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#novasight-alerts'
        send_resolved: true
  
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '<pagerduty-key>'
        severity: critical
  
  - name: 'slack'
    slack_configs:
      - channel: '#novasight-alerts'
        send_resolved: true
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ .Annotations.description }}'
```

## Application Instrumentation

### Flask Metrics

```python
# app/extensions.py
from prometheus_flask_exporter import PrometheusMetrics

metrics = PrometheusMetrics.for_app_factory()

def init_metrics(app):
    metrics.init_app(app)
    
    # Custom metrics
    metrics.info('app_info', 'Application info', version='1.0.0')
```

### Custom Metrics

```python
# app/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# Query metrics
query_counter = Counter(
    'novasight_queries_total',
    'Total queries executed',
    ['tenant_id', 'query_type', 'status']
)

query_duration = Histogram(
    'novasight_query_duration_seconds',
    'Query execution time',
    ['tenant_id', 'query_type'],
    buckets=[0.1, 0.5, 1, 2, 5, 10, 30]
)

# Active users gauge
active_users = Gauge(
    'novasight_active_users',
    'Currently active users',
    ['tenant_id']
)

# Usage example
def execute_query(tenant_id, query):
    with query_duration.labels(tenant_id=tenant_id, query_type='select').time():
        result = run_query(query)
    
    query_counter.labels(
        tenant_id=tenant_id,
        query_type='select',
        status='success'
    ).inc()
    
    return result
```

### Structured Logging

```python
# app/utils/logging.py
import structlog

def configure_logging():
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
    )

# Usage
logger = structlog.get_logger()

def process_request(request_id, tenant_id):
    log = logger.bind(
        request_id=request_id,
        tenant_id=tenant_id,
    )
    
    log.info("processing_request", endpoint="/api/v1/dashboards")
    
    try:
        result = do_work()
        log.info("request_completed", duration_ms=100)
    except Exception as e:
        log.error("request_failed", error=str(e))
        raise
```

## Health Checks

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 5000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Health Endpoints

```python
# app/api/health.py
from flask import Blueprint, jsonify
from app.extensions import db, redis_client, clickhouse_client

health_bp = Blueprint('health', __name__)

@health_bp.route('/health')
def health():
    """Liveness check - is the app running?"""
    return jsonify({"status": "healthy"}), 200

@health_bp.route('/ready')
def ready():
    """Readiness check - can the app serve traffic?"""
    checks = {
        "postgres": check_postgres(),
        "redis": check_redis(),
        "clickhouse": check_clickhouse(),
    }
    
    all_healthy = all(c["healthy"] for c in checks.values())
    status_code = 200 if all_healthy else 503
    
    return jsonify({
        "status": "ready" if all_healthy else "not_ready",
        "checks": checks
    }), status_code

def check_postgres():
    try:
        db.session.execute("SELECT 1")
        return {"healthy": True}
    except Exception as e:
        return {"healthy": False, "error": str(e)}
```

## SLOs and SLIs

### Service Level Indicators

| SLI | Target | Measurement |
|-----|--------|-------------|
| Availability | 99.9% | Successful requests / Total requests |
| Latency (p95) | < 500ms | 95th percentile response time |
| Error Rate | < 0.1% | 5xx errors / Total requests |
| Query Latency | < 5s | AI query response time |

### SLO Dashboard

```promql
# Availability SLO (99.9%)
1 - (
  sum(rate(http_requests_total{app="novasight-backend", status=~"5.."}[30d]))
  /
  sum(rate(http_requests_total{app="novasight-backend"}[30d]))
)

# Error budget remaining
(0.001 - (
  sum(increase(http_requests_total{app="novasight-backend", status=~"5.."}[30d]))
  /
  sum(increase(http_requests_total{app="novasight-backend"}[30d]))
)) / 0.001 * 100
```

---

*Last updated: January 2026*
