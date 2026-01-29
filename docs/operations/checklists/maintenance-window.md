# Maintenance Window Checklist

Use this checklist for scheduled maintenance windows.

---

## Maintenance Details

| Field | Value |
|-------|-------|
| **Maintenance ID** | |
| **Scheduled Start** | |
| **Scheduled End** | |
| **Duration** | |
| **Lead Engineer** | |
| **Purpose** | |

---

## Pre-Maintenance (24-48 hours before)

- [ ] Maintenance window approved
- [ ] Customer notification sent
- [ ] On-call engineer confirmed
- [ ] Backup completed
- [ ] Rollback plan documented
- [ ] Team notified

## Pre-Maintenance (1 hour before)

- [ ] Final backup triggered
- [ ] Verify backup success
- [ ] Check current system health
- [ ] Confirm no active incidents
- [ ] Team standby confirmed

```bash
# Trigger pre-maintenance backup
kubectl create job --from=cronjob/postgresql-backup \
  postgresql-backup-pre-maint-$(date +%Y%m%d%H%M) \
  -n novasight-prod

# Check system health
curl -s https://api.novasight.io/api/v1/health | jq .
```

---

## Start Maintenance

**Actual Start Time**: __________

### Step 1: Update Status Page

- [ ] Status page set to "maintenance"

```bash
./scripts/post-status.sh \
  --status "maintenance" \
  --message "Scheduled maintenance in progress"
```

### Step 2: Enable Maintenance Mode

- [ ] Maintenance page enabled
- [ ] Wait for in-flight requests (2 min)

```bash
# Enable maintenance response
kubectl annotate ingress novasight-ingress \
  nginx.ingress.kubernetes.io/server-snippet='return 503;' \
  -n novasight-prod

# Wait for graceful termination
sleep 120
```

### Step 3: Scale Down Applications

- [ ] Applications scaled to 0

```bash
kubectl scale deployment/backend --replicas=0 -n novasight-prod
kubectl scale deployment/frontend --replicas=0 -n novasight-prod
kubectl scale deployment/celery-worker --replicas=0 -n novasight-prod

# Verify
kubectl get pods -n novasight-prod
```

---

## Maintenance Tasks

Document tasks performed:

| Time | Task | Result | Notes |
|------|------|--------|-------|
| | | | |
| | | | |
| | | | |

---

## End Maintenance

### Step 1: Scale Up Applications

- [ ] Applications scaled up
- [ ] Pods running and ready

```bash
kubectl scale deployment/backend --replicas=5 -n novasight-prod
kubectl scale deployment/frontend --replicas=3 -n novasight-prod
kubectl scale deployment/celery-worker --replicas=3 -n novasight-prod

# Wait for ready
kubectl wait --for=condition=ready pod -l app=backend -n novasight-prod --timeout=300s
```

### Step 2: Disable Maintenance Mode

- [ ] Maintenance page disabled

```bash
kubectl annotate ingress novasight-ingress \
  nginx.ingress.kubernetes.io/server-snippet- \
  -n novasight-prod
```

### Step 3: Verify System

- [ ] Health check passing
- [ ] Smoke tests passing
- [ ] No errors in logs

```bash
# Health check
curl -s https://api.novasight.io/api/v1/health | jq .

# Smoke tests
npm run test:smoke:prod

# Check logs
kubectl logs -l app=backend -n novasight-prod --tail=50 | grep -i error
```

### Step 4: Update Status Page

- [ ] Status page set to "operational"
- [ ] Maintenance notification cleared

```bash
./scripts/post-status.sh --status "resolved" --message "Maintenance completed"
./scripts/notify-maintenance.sh --end
```

---

## Post-Maintenance

**Actual End Time**: __________
**Actual Duration**: __________

- [ ] System monitoring for 15 minutes
- [ ] No unexpected issues
- [ ] Checklist archived
- [ ] Post-maintenance summary sent

---

## Issues Encountered

```
[Document any issues here]
```

---

## Sign-off

| Role | Name | Time |
|------|------|------|
| Lead Engineer | | |
| Verification | | |
