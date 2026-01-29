# NovaSight Rollback Criteria

> **Version**: 1.0  
> **Last Updated**: 2026-01-29  
> **Owner**: Operations Lead

## Overview

This document defines the criteria for initiating a production rollback. When any of these criteria are met, rollback must be initiated immediately without waiting for management approval.

---

## Automatic Rollback Criteria

### 🔴 Critical - Immediate Rollback Required

These conditions require **immediate rollback** without waiting for approval:

| Criterion | Threshold | Detection Method |
|-----------|-----------|------------------|
| **Error Rate** | > 5% of requests returning 5xx | Prometheus alert |
| **P95 Latency** | > 10 seconds for 5+ minutes | Prometheus alert |
| **Data Integrity** | Any data corruption or loss detected | Manual/automated checks |
| **Security Breach** | Any active security vulnerability exploited | Security monitoring |
| **Complete Outage** | Application unreachable for 2+ minutes | Health check failure |
| **Database Failure** | Primary database unavailable | Database monitoring |
| **Authentication Failure** | Users unable to log in | Smoke tests |

### 🟡 Warning - Evaluate for Rollback

These conditions require **immediate evaluation** and potential rollback:

| Criterion | Threshold | Action |
|-----------|-----------|--------|
| **Elevated Error Rate** | > 1% for 10+ minutes | Investigate, prepare rollback |
| **Performance Degradation** | P95 > 5s for 10+ minutes | Investigate root cause |
| **Memory Leak** | Memory usage increasing continuously | Monitor, plan rollback window |
| **Dependency Failure** | External service unavailable | Assess impact, consider rollback |
| **Customer-Reported Issues** | 5+ reports of same issue | Investigate immediately |

---

## Rollback Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│                    ISSUE DETECTED                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│     Is it a CRITICAL criterion (red box above)?             │
└─────────────────────┬───────────────────────────────────────┘
                      │
           ┌──────────┴──────────┐
           │                     │
          YES                    NO
           │                     │
           ▼                     ▼
┌───────────────────┐  ┌────────────────────────────────────┐
│ INITIATE ROLLBACK │  │ Can issue be fixed with hotfix     │
│    IMMEDIATELY    │  │ in < 15 minutes?                   │
└───────────────────┘  └─────────────────┬──────────────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                             YES                    NO
                              │                     │
                              ▼                     ▼
                    ┌─────────────────┐   ┌───────────────────┐
                    │ DEPLOY HOTFIX   │   │ INITIATE ROLLBACK │
                    │ Monitor closely │   │ Plan proper fix   │
                    └─────────────────┘   └───────────────────┘
```

---

## Rollback Procedure

### Step 1: Announce Rollback (1 minute)

```bash
# Announce in Slack
/novasight rollback-alert "Initiating rollback due to: [REASON]"
```

**Message Template**:
```
🚨 ROLLBACK INITIATED

Time: [CURRENT TIME]
Triggered by: [PERSON]
Reason: [CRITERION MET]
Expected duration: 5-10 minutes

Incident channel: #novasight-incident-[DATE]
```

### Step 2: Execute Rollback (5 minutes)

#### Option A: Helm Rollback (Preferred)

```bash
# Check current release
helm history novasight -n production

# Rollback to previous version
helm rollback novasight [REVISION] -n production --wait --timeout 5m

# Verify rollback
kubectl get pods -n production
kubectl get deploy -n production
```

#### Option B: Manual Rollback

```bash
# Scale down new deployment
kubectl scale deploy novasight-backend --replicas=0 -n production
kubectl scale deploy novasight-frontend --replicas=0 -n production

# Apply previous manifests
kubectl apply -f k8s/backup/previous-deployment.yaml

# Scale up
kubectl scale deploy novasight-backend --replicas=3 -n production
kubectl scale deploy novasight-frontend --replicas=3 -n production
```

#### Option C: Database Rollback (If Required)

```bash
# Rollback migrations (CAUTION: may cause data loss)
kubectl exec -it deploy/novasight-backend -n production -- flask db downgrade [TARGET]

# Restore from backup (if data corruption)
./scripts/restore-database.sh [BACKUP_TIMESTAMP]
```

### Step 3: Verify Rollback (5 minutes)

```bash
# Check pod status
kubectl get pods -n production

# Check service health
curl -f https://api.novasight.io/health

# Run smoke tests
npm run test:smoke -- --env production
```

#### Verification Checklist
- [ ] All pods running and healthy
- [ ] Health endpoints responding
- [ ] Smoke tests passing
- [ ] Error rate returned to normal
- [ ] User reports resolved

### Step 4: Post-Rollback Actions

- [ ] Update status page
- [ ] Notify stakeholders
- [ ] Create incident ticket
- [ ] Begin root cause analysis
- [ ] Schedule post-mortem

---

## Rollback Authority

### Who Can Initiate Rollback

The following roles are authorized to initiate rollback without prior approval:

| Role | Authority Level |
|------|-----------------|
| SRE On-Call | Full authority for critical criteria |
| DevOps Lead | Full authority |
| Engineering Lead | Full authority |
| Security Lead | Full authority (security issues) |
| CTO | Full authority |

### Decision Escalation

If unsure about rollback decision:
1. Page Engineering Lead
2. If no response in 5 minutes, escalate to CTO
3. If criteria clearly met, proceed with rollback

---

## Rollback Prevention

### Pre-Deployment Checks

To minimize rollback probability:

1. **Staging Validation**: All changes must pass staging first
2. **Canary Deployment**: Use canary releases for major changes
3. **Feature Flags**: Gate new features behind flags
4. **Database Migration Testing**: Test migrations on staging backup

### Canary Rollback

For canary deployments, rollback the canary before full rollback:

```bash
# Scale down canary
kubectl scale deploy novasight-backend-canary --replicas=0 -n production

# Monitor for 5 minutes
# If stable, no further action needed
```

---

## Metrics and Monitoring

### Key Metrics to Watch

| Metric | Alert Threshold | Rollback Threshold |
|--------|-----------------|-------------------|
| Error Rate (5xx) | > 1% | > 5% |
| P95 Latency | > 3s | > 10s |
| P99 Latency | > 5s | > 15s |
| CPU Usage | > 80% | > 95% |
| Memory Usage | > 80% | > 95% |
| Pod Restarts | > 3/hour | > 10/hour |

### Dashboard Links

- [System Overview](https://grafana.novasight.io/d/system-overview)
- [API Performance](https://grafana.novasight.io/d/api-performance)
- [Error Dashboard](https://grafana.novasight.io/d/errors)
- [Deployment Tracking](https://grafana.novasight.io/d/deployments)

---

## Post-Rollback Communication

### Internal Notification

```markdown
## Rollback Complete

**Time Completed**: [TIME]
**Duration**: [MINUTES] minutes
**Previous Version**: [VERSION]
**Rolled Back From**: [VERSION]

### Impact
- Users affected: [NUMBER/ESTIMATE]
- Duration of impact: [MINUTES] minutes
- Data impact: None / [DESCRIPTION]

### Next Steps
1. Root cause analysis in progress
2. Post-mortem scheduled for [DATE/TIME]
3. Fix ETA: [DATE] (if known)

### Incident Lead
[NAME] - [CONTACT]
```

### Customer Notification (If Required)

```markdown
## Service Update

We experienced a brief service disruption today at [TIME].

**Duration**: Approximately [X] minutes
**Impact**: [DESCRIPTION]
**Current Status**: All systems operational

We apologize for any inconvenience. Our team is investigating the root cause 
to prevent similar issues in the future.

For questions, please contact support@novasight.io
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-29 | NovaSight Team | Initial release |
