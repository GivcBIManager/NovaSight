# NovaSight Disaster Recovery

## Overview

This document outlines the disaster recovery (DR) procedures for NovaSight, including recovery objectives, backup strategies, and step-by-step recovery procedures.

## Table of Contents

1. [Recovery Objectives](#recovery-objectives)
2. [Disaster Scenarios](#disaster-scenarios)
3. [Backup Strategy](#backup-strategy)
4. [Recovery Procedures](#recovery-procedures)
5. [DR Testing](#dr-testing)
6. [Communication Plan](#communication-plan)

---

## Recovery Objectives

### Recovery Time Objective (RTO)

| Component | RTO | Priority |
|-----------|-----|----------|
| API & Frontend | 1 hour | Critical |
| PostgreSQL | 2 hours | Critical |
| ClickHouse | 4 hours | High |
| Redis | 30 minutes | High |
| Airflow | 4 hours | Medium |

### Recovery Point Objective (RPO)

| Component | RPO | Backup Frequency |
|-----------|-----|------------------|
| PostgreSQL | 1 hour | Continuous WAL + 6hr snapshots |
| ClickHouse | 24 hours | Daily snapshots |
| Redis | 1 hour | Hourly RDB dumps |
| Application Config | 0 | Git (version controlled) |
| Secrets | 0 | Vault (replicated) |

---

## Disaster Scenarios

### Scenario Matrix

| Scenario | Likelihood | Impact | Recovery Time | Procedure |
|----------|------------|--------|---------------|-----------|
| Pod failure | High | Low | Minutes | Auto-healing |
| Node failure | Medium | Low | Minutes | Auto-rescheduling |
| AZ failure | Low | Medium | 15 minutes | Multi-AZ failover |
| Region failure | Very Low | High | 2-4 hours | DR site failover |
| Data corruption | Low | Critical | 1-4 hours | Point-in-time recovery |
| Security breach | Low | Critical | Variable | Incident response |
| Provider outage | Very Low | Critical | Hours-days | DR site or wait |

---

## Backup Strategy

### Backup Schedule

```yaml
backups:
  postgresql:
    full_snapshot: "0 */6 * * *"  # Every 6 hours
    wal_archive: "continuous"
    retention: "30 days"
    storage: "s3://novasight-backups/postgresql/"
    
  clickhouse:
    full_snapshot: "0 2 * * *"  # Daily at 2 AM
    incremental: "0 */4 * * *"  # Every 4 hours
    retention: "30 days"
    storage: "s3://novasight-backups/clickhouse/"
    
  redis:
    rdb_snapshot: "0 * * * *"  # Hourly
    aof_rewrite: "0 0 * * *"   # Daily
    retention: "7 days"
    storage: "s3://novasight-backups/redis/"
```

### Backup Verification

```bash
# Daily backup verification job
kubectl get cronjob backup-verification -n novasight-prod -o yaml

# Manual verification
./backup/scripts/verify-backup.sh --type postgresql --date $(date +%Y%m%d)
./backup/scripts/verify-backup.sh --type clickhouse --date $(date +%Y%m%d)
./backup/scripts/verify-backup.sh --type redis --date $(date +%Y%m%d)
```

### Backup Locations

```
Primary: s3://novasight-backups-us-east-1/
Secondary: s3://novasight-backups-us-west-2/

Structure:
├── postgresql/
│   ├── YYYYMMDD_HHMMSS/
│   │   ├── base.tar.gz
│   │   ├── pg_wal/
│   │   └── manifest.json
├── clickhouse/
│   ├── YYYYMMDD_HHMMSS/
│   │   ├── metadata/
│   │   ├── data/
│   │   └── manifest.json
└── redis/
    ├── redis_YYYYMMDD_HHMMSS.rdb
    └── redis_YYYYMMDD_HHMMSS.aof
```

---

## Recovery Procedures

### Procedure 1: Pod/Deployment Failure

**Automatic Recovery**: Kubernetes handles this automatically.

```bash
# Verify pods are rescheduling
kubectl get pods -n novasight-prod -w

# If stuck, manual intervention
kubectl delete pod <pod-name> -n novasight-prod

# Force deployment rollout
kubectl rollout restart deployment/<name> -n novasight-prod
```

### Procedure 2: Node Failure

**Automatic Recovery**: Kubernetes reschedules pods to healthy nodes.

```bash
# Check node status
kubectl get nodes

# Drain failed node (if it comes back)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Cordon to prevent scheduling
kubectl cordon <node-name>

# Delete node from cluster
kubectl delete node <node-name>
```

### Procedure 3: Availability Zone Failure

**Prerequisites**: Multi-AZ deployment configured.

```bash
# 1. Verify services are distributed
kubectl get pods -o wide -n novasight-prod | awk '{print $1, $7}'

# 2. Check PodDisruptionBudgets
kubectl get pdb -n novasight-prod

# 3. If needed, scale up in remaining AZs
kubectl scale deployment/backend --replicas=10 -n novasight-prod

# 4. Monitor recovery
kubectl get pods -n novasight-prod -w
```

### Procedure 4: Complete Region Failure

**Critical**: This is a major disaster scenario.

#### Step 1: Activate DR Site

```bash
# 1. Switch DNS to DR region
# Update Route53 or CloudFlare to point to DR region

# 2. Scale up DR deployments
kubectl config use-context novasight-dr
kubectl scale deployment/backend --replicas=5 -n novasight-prod
kubectl scale deployment/frontend --replicas=3 -n novasight-prod

# 3. Verify DR site health
curl -s https://api-dr.novasight.io/api/v1/health | jq .
```

#### Step 2: Restore Databases

```bash
# Restore PostgreSQL in DR region
./backup/scripts/restore-postgresql.sh \
  --target-cluster novasight-dr \
  --source-bucket s3://novasight-backups-us-west-2/postgresql \
  --latest

# Restore ClickHouse in DR region
./backup/scripts/restore-clickhouse.sh \
  --target-cluster novasight-dr \
  --source-bucket s3://novasight-backups-us-west-2/clickhouse \
  --latest

# Restore Redis
./backup/scripts/restore-redis.sh \
  --target-cluster novasight-dr \
  --source-bucket s3://novasight-backups-us-west-2/redis \
  --latest
```

#### Step 3: Verify and Cutover

```bash
# Verify data integrity
./scripts/verify-data-integrity.sh --environment dr

# Run smoke tests against DR
npm run test:smoke:dr

# Final DNS cutover
./scripts/dns-cutover.sh --target dr

# Monitor closely
kubectl get pods -n novasight-prod -w
```

### Procedure 5: PostgreSQL Recovery

#### Point-in-Time Recovery

```bash
# 1. Identify recovery target time
# Check logs/audit for when corruption occurred
RECOVERY_TIME="2026-01-29 10:30:00 UTC"

# 2. List available backups
./backup/scripts/restore-postgresql.sh --list --days 7

# 3. Stop application traffic
kubectl scale deployment/backend --replicas=0 -n novasight-prod

# 4. Restore to point in time
./backup/scripts/restore-postgresql.sh \
  --base-backup postgresql_20260129_020000 \
  --recovery-target-time "${RECOVERY_TIME}" \
  --target-db novasight_restore

# 5. Verify restored data
kubectl exec -it postgresql-0 -n novasight-prod -- \
  psql -U novasight -d novasight_restore -c "\dt"

# 6. Swap databases (if verified good)
kubectl exec -it postgresql-0 -n novasight-prod -- psql -U novasight << 'EOF'
ALTER DATABASE novasight RENAME TO novasight_corrupted;
ALTER DATABASE novasight_restore RENAME TO novasight;
EOF

# 7. Restart application
kubectl scale deployment/backend --replicas=5 -n novasight-prod

# 8. Verify functionality
npm run test:smoke:prod
```

### Procedure 6: ClickHouse Recovery

```bash
# 1. Identify backup to restore
./backup/scripts/restore-clickhouse.sh --list --days 30

# 2. Stop ingestion (optional, but prevents conflicts)
kubectl scale deployment/celery-worker-ingestion --replicas=0 -n novasight-prod

# 3. Restore specific tables or full database
./backup/scripts/restore-clickhouse.sh \
  --backup backup_20260129 \
  --tables "events,query_logs"

# OR full restore
./backup/scripts/restore-clickhouse.sh \
  --backup backup_20260129 \
  --full

# 4. Verify data
kubectl exec -it clickhouse-0 -n novasight-prod -- \
  clickhouse-client --query "SELECT count(*) FROM events"

# 5. Resume ingestion
kubectl scale deployment/celery-worker-ingestion --replicas=3 -n novasight-prod
```

### Procedure 7: Redis Recovery

```bash
# 1. Note: Redis can be rebuilt from scratch (it's a cache + session store)
# However, restoring preserves sessions and cached data

# 2. Stop Redis
kubectl scale statefulset/redis --replicas=0 -n novasight-prod

# 3. Restore RDB file
./backup/scripts/restore-redis.sh \
  --backup redis_20260129_100000.rdb

# 4. Start Redis
kubectl scale statefulset/redis --replicas=1 -n novasight-prod

# 5. Verify
kubectl exec -it redis-0 -n novasight-prod -- redis-cli DBSIZE
```

### Procedure 8: Complete Infrastructure Rebuild

**Last Resort**: When everything needs to be rebuilt.

```bash
# 1. Provision new cluster
terraform apply -target=module.kubernetes

# 2. Install base infrastructure
helm install cert-manager jetstack/cert-manager -n cert-manager
helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx

# 3. Deploy NovaSight
helm install novasight ./helm/novasight -n novasight-prod -f values-prod.yaml

# 4. Restore databases (see procedures above)

# 5. Restore secrets from Vault
./scripts/restore-secrets.sh --environment prod

# 6. Configure DNS
./scripts/configure-dns.sh --target new-cluster

# 7. Verify everything
npm run test:smoke:prod
```

---

## DR Testing

### Test Schedule

| Test Type | Frequency | Duration | Scope |
|-----------|-----------|----------|-------|
| Backup Verification | Daily | Automated | All |
| Single Component Recovery | Monthly | 1 hour | Rotating |
| Multi-Component Recovery | Quarterly | 4 hours | All databases |
| Full DR Failover | Annually | 8 hours | Everything |

### DR Test Checklist

- [ ] Pre-test backup verification
- [ ] Notify stakeholders
- [ ] Execute test scenario
- [ ] Measure RTO/RPO achieved
- [ ] Document issues encountered
- [ ] Verify data integrity post-recovery
- [ ] Failback to primary (if applicable)
- [ ] Post-test report

### Test Scenarios

#### Monthly Test: Single Database Recovery

```bash
# Test PostgreSQL PITR in isolated environment
./scripts/dr-test.sh \
  --scenario postgresql-pitr \
  --environment test \
  --target-time "1 hour ago"
```

#### Quarterly Test: Full Database Recovery

```bash
# Test all database recoveries
./scripts/dr-test.sh \
  --scenario full-database-recovery \
  --environment staging \
  --verify-data
```

#### Annual Test: Full DR Failover

```bash
# Test complete failover to DR site
./scripts/dr-test.sh \
  --scenario full-failover \
  --environment dr \
  --duration 4h \
  --failback
```

---

## Communication Plan

### DR Activation Communication

| When | Who | Channel | Message |
|------|-----|---------|---------|
| DR Detected | On-Call | PagerDuty | Alert |
| DR Confirmed | Incident Commander | Slack #incidents | Status |
| DR in Progress | Customer Success | Status Page | Customer notification |
| DR Complete | Incident Commander | All channels | All clear |

### Templates

#### DR Activation

```markdown
🚨 **DISASTER RECOVERY ACTIVATED**

**Time**: [timestamp]
**Scenario**: [description]
**Impact**: [affected services]
**ETA**: [estimated recovery time]

Updates will be provided every 30 minutes.

Incident Commander: @[name]
Channel: #dr-[date]
```

#### DR Complete

```markdown
✅ **DISASTER RECOVERY COMPLETE**

**Duration**: [time]
**Services Restored**: All
**Data Loss**: [if any]

Please report any issues to #support.

Post-mortem scheduled: [date/time]
```

---

## DR Contacts

| Role | Primary | Secondary | Phone |
|------|---------|-----------|-------|
| DR Commander | Bob Wilson | Jane Smith | +1-555-0100 |
| DBA | Charlie Davis | Emily Chen | +1-555-0101 |
| Infrastructure | Alice Brown | John Doe | +1-555-0102 |
| Security | Frank Miller | - | +1-555-0103 |

### External Contacts

| Service | Contact | SLA |
|---------|---------|-----|
| AWS Support | Premium Portal | 15 min (Critical) |
| S3 Support | Via AWS | - |
| Domain Registrar | Emergency hotline | 1 hour |

---

## Related Documents

- [Deployment Runbook](deployment-runbook.md)
- [Backup Recovery Runbook](../../backup/docs/RECOVERY_RUNBOOK.md)
- [Point-in-Time Recovery](../../backup/docs/PITR_RECOVERY.md)
- [Incident Response](incident-response.md)
