# NovaSight Maintenance Procedures

## Overview

This document outlines procedures for routine maintenance tasks, scheduled maintenance windows, and system health checks.

## Table of Contents

1. [Maintenance Types](#maintenance-types)
2. [Scheduled Maintenance](#scheduled-maintenance)
3. [Routine Tasks](#routine-tasks)
4. [Database Maintenance](#database-maintenance)
5. [Security Maintenance](#security-maintenance)
6. [Monitoring & Health Checks](#monitoring--health-checks)

---

## Maintenance Types

| Type | Frequency | Downtime | Notice Period |
|------|-----------|----------|---------------|
| **Routine** | Daily/Weekly | None | None |
| **Scheduled** | Monthly | Possible | 7 days |
| **Critical** | As needed | Likely | 24 hours |
| **Emergency** | As needed | Yes | ASAP |

---

## Scheduled Maintenance

### Maintenance Window

- **Primary Window**: Sundays 02:00-06:00 UTC
- **Secondary Window**: Wednesdays 02:00-04:00 UTC (if needed)
- **Freeze Periods**: Last week of quarter (no scheduled maintenance)

### Pre-Maintenance Checklist

- [ ] Maintenance window approved
- [ ] Customer notification sent (7 days prior for planned)
- [ ] On-call engineer confirmed
- [ ] Rollback plan documented
- [ ] Backup completed within 24 hours
- [ ] Team notified in #engineering channel

### Maintenance Mode Procedure

#### Enable Maintenance Mode

```bash
# 1. Send maintenance notification
./scripts/notify-maintenance.sh \
  --start-time "2026-02-01 02:00 UTC" \
  --duration 60 \
  --reason "Scheduled database maintenance"

# 2. Update status page
./scripts/post-status.sh \
  --status "maintenance" \
  --component "All" \
  --message "Scheduled maintenance in progress"

# 3. Enable maintenance page
kubectl annotate ingress novasight-ingress \
  nginx.ingress.kubernetes.io/server-snippet='
    location / {
      return 503;
      default_type text/html;
      content_by_lua_block {
        ngx.say("<html><body><h1>Maintenance in Progress</h1></body></html>")
      }
    }
  ' \
  -n novasight-prod

# 4. Wait for in-flight requests (2 minutes)
sleep 120

# 5. Scale down application
kubectl scale deployment/backend --replicas=0 -n novasight-prod
kubectl scale deployment/frontend --replicas=0 -n novasight-prod
kubectl scale deployment/celery-worker --replicas=0 -n novasight-prod
```

#### Perform Maintenance

```bash
# Perform your maintenance tasks here
# Example: Database migrations, certificate rotation, etc.
```

#### Disable Maintenance Mode

```bash
# 1. Scale up application
kubectl scale deployment/backend --replicas=5 -n novasight-prod
kubectl scale deployment/frontend --replicas=3 -n novasight-prod
kubectl scale deployment/celery-worker --replicas=3 -n novasight-prod

# 2. Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=backend -n novasight-prod --timeout=300s

# 3. Remove maintenance mode
kubectl annotate ingress novasight-ingress \
  nginx.ingress.kubernetes.io/server-snippet- \
  -n novasight-prod

# 4. Verify health
curl -s https://api.novasight.io/api/v1/health | jq .

# 5. Run smoke tests
npm run test:smoke:prod

# 6. Update status page
./scripts/post-status.sh \
  --status "resolved" \
  --component "All" \
  --message "Scheduled maintenance completed"

# 7. Send completion notification
./scripts/notify-maintenance.sh --end
```

---

## Routine Tasks

### Daily Tasks

| Task | Command | Automated |
|------|---------|-----------|
| Check pod status | `kubectl get pods -n novasight-prod` | ✓ |
| Review error logs | Check Sentry dashboard | ✓ |
| Check backup status | Verify backup jobs succeeded | ✓ |
| Monitor disk usage | Alert at 80% threshold | ✓ |
| Review security alerts | Check security dashboard | ✓ |

### Weekly Tasks

```bash
# 1. Review resource utilization trends
# Check Grafana: https://grafana.novasight.io/d/capacity

# 2. Clean up old jobs
kubectl delete jobs --field-selector status.successful=1 -n novasight-prod --all

# 3. Clean up completed pods
kubectl delete pods --field-selector status.phase=Succeeded -n novasight-prod

# 4. Review HPA behavior
kubectl describe hpa -n novasight-prod

# 5. Check certificate expiration
kubectl get certificates -n novasight-prod -o wide

# 6. Review pending security patches
# Check Dependabot alerts in GitHub
```

### Monthly Tasks

```bash
# 1. Rotate secrets (if not automated)
./scripts/rotate-secrets.sh --environment prod

# 2. Review and update dependencies
# Create PR for dependency updates

# 3. Audit access logs
./scripts/audit-access.sh --last-month

# 4. Review cost reports
# Check cloud provider console

# 5. Disaster recovery test (quarterly)
# Run DR drill on schedule

# 6. Performance baseline update
k6 run ./performance/k6/baseline-test.js
```

---

## Database Maintenance

### PostgreSQL

#### Vacuum and Analyze

```bash
# Run vacuum analyze on all tables
kubectl exec -it postgresql-0 -n novasight-prod -- \
  psql -U novasight -d novasight -c "VACUUM ANALYZE;"

# Vacuum specific large tables
kubectl exec -it postgresql-0 -n novasight-prod -- \
  psql -U novasight -d novasight -c "VACUUM ANALYZE query_logs;"
```

#### Reindex

```bash
# Reindex specific table (can be run online)
kubectl exec -it postgresql-0 -n novasight-prod -- \
  psql -U novasight -d novasight -c "REINDEX TABLE CONCURRENTLY users;"

# Reindex entire database (maintenance window recommended)
kubectl exec -it postgresql-0 -n novasight-prod -- \
  psql -U novasight -d novasight -c "REINDEX DATABASE CONCURRENTLY novasight;"
```

#### Statistics Update

```bash
# Update table statistics for query planner
kubectl exec -it postgresql-0 -n novasight-prod -- \
  psql -U novasight -d novasight -c "ANALYZE VERBOSE;"
```

#### Check for Bloat

```bash
# Check table bloat
kubectl exec -it postgresql-0 -n novasight-prod -- \
  psql -U novasight -d novasight -c "
    SELECT schemaname, tablename, 
           pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
           n_dead_tup as dead_tuples
    FROM pg_stat_user_tables 
    ORDER BY n_dead_tup DESC 
    LIMIT 10;"
```

### ClickHouse

#### Optimize Tables

```bash
# Optimize partitions
kubectl exec -it clickhouse-0 -n novasight-prod -- \
  clickhouse-client --query "OPTIMIZE TABLE events FINAL;"

# Check table sizes
kubectl exec -it clickhouse-0 -n novasight-prod -- \
  clickhouse-client --query "
    SELECT database, table, 
           formatReadableSize(sum(bytes)) as size,
           sum(rows) as rows
    FROM system.parts
    WHERE active
    GROUP BY database, table
    ORDER BY sum(bytes) DESC
    LIMIT 10;"
```

#### Clean Old Partitions

```bash
# Drop old partitions (if retention policy not automated)
kubectl exec -it clickhouse-0 -n novasight-prod -- \
  clickhouse-client --query "
    ALTER TABLE events DROP PARTITION '202501';"
```

### Redis

#### Memory Management

```bash
# Check memory usage
kubectl exec -it redis-0 -n novasight-prod -- redis-cli INFO memory

# Clear specific cache prefixes
kubectl exec -it redis-0 -n novasight-prod -- redis-cli --scan --pattern 'cache:query:*' | xargs redis-cli DEL

# Run memory defragmentation (if needed)
kubectl exec -it redis-0 -n novasight-prod -- redis-cli MEMORY DOCTOR
```

---

## Security Maintenance

### Certificate Management

```bash
# Check certificate expiration
kubectl get certificates -n novasight-prod -o wide

# Force certificate renewal
kubectl delete certificate novasight-tls -n novasight-prod
# cert-manager will automatically recreate

# Verify new certificate
kubectl describe certificate novasight-tls -n novasight-prod
```

### Secret Rotation

```bash
# Rotate database credentials
./scripts/rotate-secrets.sh --secret postgres-password

# Rotate JWT signing key
./scripts/rotate-secrets.sh --secret jwt-secret

# Rotate API keys
./scripts/rotate-secrets.sh --secret api-keys

# Verify applications picked up new secrets
kubectl rollout restart deployment/backend -n novasight-prod
```

### Security Patching

```bash
# Update base images
./scripts/rebuild-images.sh --security-only

# Apply Kubernetes security updates
kubectl get nodes -o wide  # Check node versions
# Coordinate with cloud provider for node updates

# Update Helm charts
helm repo update
helm upgrade novasight ./helm/novasight -n novasight-prod --dry-run
```

### Access Review

```bash
# Audit service account permissions
kubectl auth can-i --list --as=system:serviceaccount:novasight-prod:backend

# Review RBAC bindings
kubectl get rolebindings,clusterrolebindings -n novasight-prod -o wide

# Check for overly permissive access
kubectl get secrets -n novasight-prod -o json | jq '.items[].metadata.name'
```

---

## Monitoring & Health Checks

### System Health Check Script

```bash
#!/bin/bash
# health-check.sh

echo "=== NovaSight Health Check ==="
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# API Health
echo -e "\n📡 API Health:"
curl -s https://api.novasight.io/api/v1/health | jq .

# Pod Status
echo -e "\n🔄 Pod Status:"
kubectl get pods -n novasight-prod --no-headers | awk '{print $1, $2, $3}'

# Resource Usage
echo -e "\n💻 Resource Usage:"
kubectl top pods -n novasight-prod --sort-by=cpu | head -10

# HPA Status
echo -e "\n📈 HPA Status:"
kubectl get hpa -n novasight-prod --no-headers

# Disk Usage
echo -e "\n💾 PVC Usage:"
kubectl get pvc -n novasight-prod -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,CAPACITY:.status.capacity.storage

# Certificate Status
echo -e "\n🔐 Certificates:"
kubectl get certificates -n novasight-prod -o custom-columns=NAME:.metadata.name,READY:.status.conditions[0].status,EXPIRY:.status.notAfter

# Recent Errors (last 5 minutes)
echo -e "\n⚠️ Recent Errors:"
kubectl logs -l app=backend -n novasight-prod --since=5m 2>/dev/null | grep -i error | tail -5 || echo "No errors found"

echo -e "\n=== Health Check Complete ==="
```

### Automated Monitoring Checks

| Check | Interval | Alert Threshold | Dashboard |
|-------|----------|-----------------|-----------|
| API Health | 30s | 3 failures | Overview |
| Error Rate | 1m | >1% | Errors |
| P95 Latency | 1m | >1s | API Metrics |
| CPU Usage | 1m | >80% | Infrastructure |
| Memory Usage | 1m | >85% | Infrastructure |
| Disk Usage | 5m | >80% | Infrastructure |
| Certificate Expiry | Daily | <14 days | Security |
| Backup Status | Daily | Failed | Operations |

### Log Review

```bash
# Application errors (last hour)
kubectl logs -l app=backend -n novasight-prod --since=1h 2>/dev/null | grep -i error

# Slow queries
kubectl logs -l app=backend -n novasight-prod --since=1h 2>/dev/null | grep "slow query"

# Authentication failures
kubectl logs -l app=backend -n novasight-prod --since=1h 2>/dev/null | grep "authentication failed"

# Rate limiting events
kubectl logs -l app=backend -n novasight-prod --since=1h 2>/dev/null | grep "rate limit"
```

---

## Maintenance Calendar

### Recurring Schedule

| Task | Frequency | Day | Time (UTC) |
|------|-----------|-----|------------|
| Database VACUUM | Weekly | Sunday | 03:00 |
| Log Rotation | Daily | - | 00:00 |
| Backup Verification | Weekly | Saturday | 04:00 |
| Security Scans | Daily | - | 02:00 |
| Certificate Check | Daily | - | 06:00 |
| Dependency Updates | Weekly | Tuesday | - |
| DR Test | Quarterly | First Sunday | 02:00 |

### Freeze Periods

- End of quarter (last week)
- Major holidays
- Customer-specific blackout dates (per tenant SLA)

---

## Related Documents

- [Deployment Runbook](deployment-runbook.md)
- [Incident Response](incident-response.md)
- [Disaster Recovery](disaster-recovery.md)
- [Security Policies](../security/policies.md)
