# NovaSight Deployment Runbook

## Overview

This document provides comprehensive procedures for deploying, updating, and maintaining the NovaSight BI platform in production and staging environments.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Procedures](#deployment-procedures)
3. [Rollback Procedures](#rollback-procedures)
4. [Scaling Operations](#scaling-operations)
5. [Incident Response](#incident-response)
6. [Emergency Contacts](#emergency-contacts)

---

## Pre-Deployment Checklist

### Before Every Deployment

!!! warning "Mandatory Checks"
    Complete ALL items before proceeding with deployment.

| Check | Description | Owner |
|-------|-------------|-------|
| ✅ CI Passing | All tests passing in GitHub Actions | DevOps |
| ✅ Code Review | PR approved by at least 2 reviewers | Dev Lead |
| ✅ Security Scan | SAST/DAST scans passed, no critical findings | Security |
| ✅ Release Notes | CHANGELOG.md updated with new version | Dev Lead |
| ✅ DB Migrations | Migration scripts reviewed and tested | Backend Lead |
| ✅ On-Call Notified | On-call engineer acknowledged | DevOps |
| ✅ Maintenance Window | Scheduled if needed (major releases) | Operations |

### For Major Releases (Minor/Major Version Bumps)

| Check | Description | Owner |
|-------|-------------|-------|
| ✅ Load Testing | K6 tests passed at 2x expected load | QA |
| ✅ Staging Validated | Full regression on staging environment | QA |
| ✅ Customer Comms | Notification prepared for affected tenants | Customer Success |
| ✅ Rollback Plan | Documented and reviewed | DevOps |
| ✅ Feature Flags | New features behind flags if needed | Dev Lead |
| ✅ Dashboards Ready | Monitoring dashboards configured | SRE |
| ✅ Runbook Updated | Operational procedures current | DevOps |

### Environment Verification

```bash
# Verify cluster connectivity
kubectl cluster-info
kubectl get nodes -o wide

# Check current deployments
kubectl get deployments -n novasight-prod
kubectl get pods -n novasight-prod

# Verify secrets and configmaps
kubectl get secrets -n novasight-prod
kubectl get configmaps -n novasight-prod

# Check persistent volumes
kubectl get pvc -n novasight-prod
```

---

## Deployment Procedures

### Version Naming Convention

```
v<major>.<minor>.<patch>[-<prerelease>]

Examples:
  v1.2.3        - Production release
  v1.2.3-rc.1   - Release candidate
  v1.2.3-beta.1 - Beta release
  v1.2.3-alpha  - Alpha release
```

### Staging Deployment

#### Step 1: Prepare Release

```bash
# Ensure you're on the correct branch
git checkout develop
git pull origin develop

# Verify tests pass locally
make test

# Review recent changes
git log --oneline -20
```

#### Step 2: Tag the Release

```bash
# Create annotated tag
git tag -a v1.2.3 -m "Release v1.2.3

Features:
- New dashboard widget types
- Improved NL2SQL accuracy

Fixes:
- Fixed connection timeout handling
- Resolved memory leak in query cache"

# Push tag to trigger CI/CD
git push origin v1.2.3
```

#### Step 3: Monitor Deployment

```bash
# Watch GitHub Actions
# URL: https://github.com/novasight/novasight/actions

# Monitor rollout
kubectl rollout status deployment/backend -n novasight-staging --timeout=5m
kubectl rollout status deployment/frontend -n novasight-staging --timeout=5m

# Check pod status
kubectl get pods -n novasight-staging -w
```

#### Step 4: Verify Staging Deployment

```bash
# Health check
curl -s https://staging-api.novasight.io/api/v1/health | jq .

# Expected response:
# {
#   "status": "healthy",
#   "version": "1.2.3",
#   "timestamp": "2026-01-29T10:00:00Z"
# }

# Run smoke tests
npm run test:smoke:staging

# Verify key functionality
# - Login works
# - Dashboard loads
# - Data sources connect
# - Queries execute
```

### Production Deployment

!!! danger "Production Changes"
    Always have a rollback plan ready. Monitor closely for 30 minutes post-deployment.

#### Step 1: Merge to Main

```bash
# Create PR from develop to main
gh pr create --base main --head develop --title "Release v1.2.3"

# After approval, merge
gh pr merge <PR_NUMBER> --merge

# Or manually
git checkout main
git merge develop --no-ff -m "Merge release v1.2.3"
git push origin main
```

#### Step 2: Create Production Tag

```bash
# Tag for production
git tag -a v1.2.3-prod -m "Production release v1.2.3"
git push origin v1.2.3-prod
```

#### Step 3: Deploy to Production

=== "Automated (Recommended)"

    ```bash
    # GitHub Actions deploys automatically on prod tag
    # Requires manual approval in GitHub Actions UI
    
    # Monitor the workflow
    gh run watch
    ```

=== "Manual Deployment"

    ```bash
    # Set new image for backend
    kubectl set image deployment/backend \
      backend=ghcr.io/novasight/backend:v1.2.3 \
      -n novasight-prod
    
    # Set new image for frontend
    kubectl set image deployment/frontend \
      frontend=ghcr.io/novasight/frontend:v1.2.3 \
      -n novasight-prod
    
    # Set new image for workers
    kubectl set image deployment/celery-worker \
      worker=ghcr.io/novasight/backend:v1.2.3 \
      -n novasight-prod
    ```

#### Step 4: Watch Rollout

```bash
# Monitor backend rollout
kubectl rollout status deployment/backend -n novasight-prod --timeout=10m

# Monitor frontend rollout
kubectl rollout status deployment/frontend -n novasight-prod --timeout=5m

# Watch pods
kubectl get pods -n novasight-prod -l app=novasight -w
```

#### Step 5: Run Database Migrations

```bash
# Check if migrations are needed
kubectl exec -n novasight-prod deployment/backend -- flask db current
kubectl exec -n novasight-prod deployment/backend -- flask db heads

# If migrations needed, run them
kubectl exec -n novasight-prod deployment/backend -- flask db upgrade

# Verify migration success
kubectl exec -n novasight-prod deployment/backend -- flask db current
```

#### Step 6: Verify Production

```bash
# Health check
curl -s https://api.novasight.io/api/v1/health | jq .

# Run production smoke tests
npm run test:smoke:prod

# Check error rate in Grafana
# URL: https://grafana.novasight.io/d/novasight-overview

# Check application logs
kubectl logs -f deployment/backend -n novasight-prod --tail=100
```

#### Step 7: Post-Deployment Monitoring

Monitor the following for **30 minutes**:

- Error rate (should be < 0.1%)
- P95 latency (should be < 500ms)
- CPU/Memory usage
- Database connection pool
- Queue depth
- User reports

```bash
# Quick metrics check
kubectl top pods -n novasight-prod

# Check HPA status
kubectl get hpa -n novasight-prod
```

### Database Migration Deployment

For migrations that require downtime or are high-risk:

#### Step 1: Schedule Maintenance Window

```bash
# Notify users (24 hours in advance for planned maintenance)
./scripts/notify-maintenance.sh \
  --start-time "2026-01-30 02:00 UTC" \
  --duration 30 \
  --reason "Database maintenance and optimization"
```

#### Step 2: Create Backup

```bash
# Trigger immediate backup
kubectl create job --from=cronjob/postgresql-backup \
  postgresql-backup-premigration-$(date +%Y%m%d%H%M) \
  -n novasight-prod

# Verify backup completed
kubectl get jobs -n novasight-prod | grep premigration
kubectl logs job/postgresql-backup-premigration-* -n novasight-prod
```

#### Step 3: Enable Maintenance Mode

```bash
# Scale down API (stops new requests)
kubectl scale deployment/backend --replicas=0 -n novasight-prod

# Verify no active connections (wait for in-flight requests)
sleep 30

# Enable maintenance page on ingress
kubectl annotate ingress novasight-ingress \
  nginx.ingress.kubernetes.io/configuration-snippet='return 503;' \
  -n novasight-prod
```

#### Step 4: Run Migration

```bash
# Run migration job
kubectl run migration-job-$(date +%Y%m%d%H%M) \
  --image=ghcr.io/novasight/backend:v1.2.3 \
  --restart=Never \
  --env="DATABASE_URL=${DATABASE_URL}" \
  --env="FLASK_APP=app" \
  -n novasight-prod \
  -- flask db upgrade

# Monitor migration
kubectl logs -f migration-job-* -n novasight-prod
```

#### Step 5: Verify Migration

```bash
# Connect to database and verify
kubectl exec -it postgresql-0 -n novasight-prod -- psql -U novasight -d novasight

# Check schema version
SELECT * FROM alembic_version;

# Verify table structures
\dt
\d+ affected_table_name
```

#### Step 6: Resume Service

```bash
# Remove maintenance mode
kubectl annotate ingress novasight-ingress \
  nginx.ingress.kubernetes.io/configuration-snippet- \
  -n novasight-prod

# Scale up backend
kubectl scale deployment/backend --replicas=5 -n novasight-prod

# Verify pods are running
kubectl get pods -n novasight-prod -l app=backend -w
```

#### Step 7: End Maintenance Window

```bash
# Notify users maintenance is complete
./scripts/notify-maintenance.sh --end

# Verify functionality
npm run test:smoke:prod
```

---

## Rollback Procedures

### Immediate Rollback (No DB Changes)

Use when the new version has issues but no database migrations were applied:

```bash
# Rollback backend to previous version
kubectl rollout undo deployment/backend -n novasight-prod

# Rollback frontend to previous version
kubectl rollout undo deployment/frontend -n novasight-prod

# Rollback workers
kubectl rollout undo deployment/celery-worker -n novasight-prod

# Verify rollback
kubectl rollout status deployment/backend -n novasight-prod
kubectl rollout status deployment/frontend -n novasight-prod

# Confirm health
curl -s https://api.novasight.io/api/v1/health | jq .

# Check version rolled back correctly
curl -s https://api.novasight.io/api/v1/health | jq '.version'
```

### Rollback to Specific Version

```bash
# Check rollout history
kubectl rollout history deployment/backend -n novasight-prod

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=5 -n novasight-prod

# Or deploy specific image version
kubectl set image deployment/backend \
  backend=ghcr.io/novasight/backend:v1.2.2 \
  -n novasight-prod
```

### Rollback with Database Migration

!!! danger "Data Loss Risk"
    Database rollbacks may result in data loss. Proceed with caution.

```bash
# 1. Stop new traffic
kubectl scale deployment/backend --replicas=0 -n novasight-prod

# 2. Check migration history
kubectl exec deployment/backend -n novasight-prod -- flask db history

# Output example:
# a1b2c3d4e5f6 -> HEAD (head), Add user preferences table
# 987654321fed -> a1b2c3d4e5f6, Add dashboard sharing
# 123456789abc -> 987654321fed, Initial schema

# 3. Downgrade to target revision
kubectl exec deployment/backend -n novasight-prod -- flask db downgrade 987654321fed

# 4. Deploy previous application version
kubectl set image deployment/backend \
  backend=ghcr.io/novasight/backend:v1.2.2 \
  -n novasight-prod

# 5. Scale up
kubectl scale deployment/backend --replicas=5 -n novasight-prod

# 6. Verify
curl -s https://api.novasight.io/api/v1/health | jq .
```

### Rollback from Backup (Disaster Recovery)

!!! danger "Last Resort"
    Only use when other rollback methods have failed. See [Disaster Recovery](disaster-recovery.md).

```bash
# 1. Stop all application pods
kubectl scale deployment/backend --replicas=0 -n novasight-prod
kubectl scale deployment/frontend --replicas=0 -n novasight-prod
kubectl scale deployment/celery-worker --replicas=0 -n novasight-prod

# 2. Restore PostgreSQL from backup
./backup/scripts/restore-postgresql.sh \
  --backup postgresql_20260129_020000.sql.gz \
  --target-db novasight

# 3. Restore ClickHouse from backup
./backup/scripts/restore-clickhouse.sh \
  --backup backup_20260129

# 4. Deploy known-good version
kubectl set image deployment/backend \
  backend=ghcr.io/novasight/backend:v1.2.0 \
  -n novasight-prod

kubectl set image deployment/frontend \
  frontend=ghcr.io/novasight/frontend:v1.2.0 \
  -n novasight-prod

# 5. Scale up
kubectl scale deployment/backend --replicas=5 -n novasight-prod
kubectl scale deployment/frontend --replicas=3 -n novasight-prod
kubectl scale deployment/celery-worker --replicas=3 -n novasight-prod

# 6. Verify full functionality
npm run test:smoke:prod
```

---

## Scaling Operations

### Horizontal Pod Autoscaling

NovaSight uses HPA for automatic scaling based on resource utilization:

```yaml
# Current HPA configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: novasight-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 5
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Manual Scaling

```bash
# Scale backend deployment
kubectl scale deployment/backend --replicas=10 -n novasight-prod

# Scale frontend deployment
kubectl scale deployment/frontend --replicas=5 -n novasight-prod

# Scale workers
kubectl scale deployment/celery-worker --replicas=10 -n novasight-prod
```

### Update HPA Limits

```bash
# Increase max replicas for expected traffic
kubectl patch hpa backend-hpa -n novasight-prod \
  --patch '{"spec":{"maxReplicas":30}}'

# Verify HPA
kubectl get hpa -n novasight-prod
kubectl describe hpa backend-hpa -n novasight-prod
```

### Database Scaling

See [Scaling Guide](scaling-guide.md) for detailed database scaling procedures.

```bash
# Add ClickHouse replica
helm upgrade novasight ./helm/novasight \
  --set clickhouse.replicaCount=3 \
  -n novasight-prod

# Increase PostgreSQL resources
kubectl patch statefulset postgresql -n novasight-prod \
  --patch '{"spec":{"template":{"spec":{"containers":[{"name":"postgresql","resources":{"limits":{"memory":"8Gi","cpu":"4"}}}]}}}}'
```

### Emergency Capacity

For unexpected traffic spikes:

```bash
# Burst capacity - scale all components
kubectl scale deployment/backend --replicas=30 -n novasight-prod
kubectl scale deployment/frontend --replicas=10 -n novasight-prod
kubectl scale deployment/celery-worker --replicas=20 -n novasight-prod

# Scale Redis for increased cache capacity
kubectl scale statefulset redis --replicas=3 -n novasight-prod

# If using cloud provider, add more nodes
# Azure AKS
az aks scale \
  --resource-group novasight-rg \
  --name novasight-prod \
  --node-count 15

# AWS EKS
eksctl scale nodegroup \
  --cluster novasight-prod \
  --name workers \
  --nodes 15
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Escalation | Examples |
|-------|-------------|---------------|------------|----------|
| **SEV1** | Complete outage | 15 min | Immediate | API down, data loss, security breach |
| **SEV2** | Major degradation | 30 min | 1 hour | 50%+ users affected, auth issues |
| **SEV3** | Minor degradation | 4 hours | Next day | Feature broken, slow queries |
| **SEV4** | Low impact | 24 hours | None | Cosmetic bugs, minor inconvenience |

### Incident Response Procedure

#### 1. Acknowledge

```bash
# Acknowledge in PagerDuty (within SLA)
# Post in #incidents Slack channel
```

```markdown
🚨 **Incident Acknowledged**
- Time: 2026-01-29 10:00 UTC
- Severity: SEV2
- Summary: API latency increased to 5s+
- Responder: @johndoe
- Status: Investigating
```

#### 2. Assess Impact

```bash
# Check pod status
kubectl get pods -n novasight-prod

# Check recent logs
kubectl logs -f deployment/backend -n novasight-prod --tail=200 --since=5m

# Check error rates in Grafana
# URL: https://grafana.novasight.io/d/novasight-errors

# Check database connections
kubectl exec -it postgresql-0 -n novasight-prod -- \
  psql -U novasight -c "SELECT count(*) FROM pg_stat_activity;"

# Check Redis
kubectl exec -it redis-0 -n novasight-prod -- redis-cli info | grep connected
```

#### 3. Communicate

```bash
# Update status page
./scripts/post-status.sh \
  --status "investigating" \
  --component "API" \
  --message "We are investigating increased API latency"
```

#### 4. Mitigate

Quick mitigation options:

| Symptom | Quick Fix |
|---------|-----------|
| High latency | Scale up pods, check DB queries |
| 5xx errors | Restart pods, check logs |
| Auth failures | Check JWT secret, restart Redis |
| DB timeout | Increase connection limits, restart DB |
| OOMKilled | Increase memory limits, scale up |
| High CPU | Scale up pods, identify hot queries |

```bash
# Restart problematic pods
kubectl rollout restart deployment/backend -n novasight-prod

# Quick scale up
kubectl scale deployment/backend --replicas=15 -n novasight-prod
```

#### 5. Resolve

```bash
# Deploy fix if needed
kubectl set image deployment/backend \
  backend=ghcr.io/novasight/backend:v1.2.3-hotfix \
  -n novasight-prod

# Verify fix
curl -s https://api.novasight.io/api/v1/health | jq .
npm run test:smoke:prod
```

#### 6. Post-Incident

```markdown
🟢 **Incident Resolved**
- Time: 2026-01-29 10:45 UTC
- Duration: 45 minutes
- Root Cause: Database connection pool exhaustion
- Resolution: Increased max connections, deployed fix
- Follow-up: Post-mortem scheduled for 2026-01-30
```

### Common Issues Quick Reference

| Issue | Symptoms | Diagnostic | Fix |
|-------|----------|------------|-----|
| High Latency | P95 > 2s | Check slow query log | Optimize query, add index |
| 5xx Errors | Error rate > 1% | Check application logs | Fix bug, rollback |
| Auth Failures | 401 responses | Check JWT, Redis | Rotate secret, restart |
| DB Connection | Timeout errors | Check connections | Increase pool, restart |
| Memory Pressure | OOMKilled pods | Check memory usage | Increase limits |
| Disk Full | Write errors | Check PVC usage | Expand PVC, clean up |
| SSL Errors | Certificate warnings | Check cert expiry | Renew certificate |

---

## Emergency Contacts

| Role | Name | Phone | Slack | PagerDuty |
|------|------|-------|-------|-----------|
| Primary On-Call | Rotating | See PagerDuty | @oncall | auto |
| Backend Lead | John Doe | +1-555-0101 | @john.doe | john.doe |
| Frontend Lead | Jane Smith | +1-555-0102 | @jane.smith | jane.smith |
| Infrastructure | Bob Wilson | +1-555-0103 | @bob.wilson | bob.wilson |
| Security | Alice Brown | +1-555-0104 | @alice.brown | alice.brown |
| Database Admin | Charlie Davis | +1-555-0105 | @charlie.davis | charlie.davis |
| VP Engineering | Emily Johnson | +1-555-0100 | @emily.johnson | - |

### Escalation Path

```
SEV1/SEV2:
  On-Call → Backend/Frontend Lead (15 min) → VP Engineering (30 min)

SEV3:
  On-Call → Team Lead (4 hours)

SEV4:
  Standard ticketing process
```

### External Contacts

| Service | Contact | SLA |
|---------|---------|-----|
| AWS Support | Premium Support Portal | 15 min (SEV1) |
| Azure Support | Premier Support | 15 min (SEV1) |
| Cloudflare | Enterprise Support | 1 hour |
| PagerDuty | support@pagerduty.com | - |

---

## Related Documents

- [Scaling Guide](scaling-guide.md)
- [Incident Response Procedures](incident-response.md)
- [Disaster Recovery](disaster-recovery.md)
- [Maintenance Procedures](maintenance-procedures.md)
- [Recovery Runbook](../../backup/docs/RECOVERY_RUNBOOK.md)
- [Checklists](checklists/README.md)
