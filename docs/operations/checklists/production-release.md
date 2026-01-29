# Production Release Checklist

Step-by-step checklist for production deployments.

---

## Pre-Release (1 day before)

- [ ] Pre-deployment checklist completed
- [ ] Staging deployment successful
- [ ] Staging verified by QA
- [ ] Release approved by team lead
- [ ] On-call schedule confirmed

## Release Day - Preparation

**Start Time**: __________ (UTC)
**Release Version**: __________
**Release Manager**: __________

### Before Starting

- [ ] Join #deployments Slack channel
- [ ] Confirm team availability
- [ ] Verify backup completed (within 6 hours)
- [ ] Check current system health
- [ ] Review any active incidents

```bash
# Health check
curl -s https://api.novasight.io/api/v1/health | jq .

# Pod status
kubectl get pods -n novasight-prod

# Check for active incidents
# [Check PagerDuty/Status Page]
```

## Deployment Steps

### Step 1: Tag Release

- [ ] Merge develop to main
- [ ] Create production tag

```bash
git checkout main
git merge develop
git push origin main
git tag -a v__.__.__-prod -m "Production release v__.__.__"
git push origin v__.__.__-prod
```

### Step 2: Deploy

- [ ] Trigger deployment (automatic or manual)
- [ ] Monitor rollout progress

```bash
# Watch rollout
kubectl rollout status deployment/backend -n novasight-prod
kubectl rollout status deployment/frontend -n novasight-prod
```

### Step 3: Run Migrations (if applicable)

- [ ] Verify migration is needed
- [ ] Run migration
- [ ] Verify migration success

```bash
kubectl exec -n novasight-prod deployment/backend -- flask db upgrade
kubectl exec -n novasight-prod deployment/backend -- flask db current
```

### Step 4: Verify Deployment

- [ ] Health check passing
- [ ] Version number correct
- [ ] Smoke tests passing

```bash
# Verify version
curl -s https://api.novasight.io/api/v1/health | jq '.version'

# Run smoke tests
npm run test:smoke:prod
```

### Step 5: Post-Deployment Monitoring

**Monitor for 30 minutes**

- [ ] Error rate normal (< 0.1%)
- [ ] Latency normal (P95 < 500ms)
- [ ] No user-reported issues
- [ ] CPU/Memory stable
- [ ] No alert triggers

## Post-Release

- [ ] Update status page (if was degraded)
- [ ] Post in #releases with summary
- [ ] Close release ticket/issue
- [ ] Archive this checklist

## Rollback (if needed)

**Rollback Trigger Criteria:**
- Error rate > 1%
- P95 latency > 2s
- Critical user-facing bug
- Security vulnerability discovered

**Rollback Steps:**

```bash
kubectl rollout undo deployment/backend -n novasight-prod
kubectl rollout undo deployment/frontend -n novasight-prod
```

---

## Release Log

| Time (UTC) | Action | Result | Notes |
|------------|--------|--------|-------|
| | Started deployment | | |
| | Backend rolled out | | |
| | Frontend rolled out | | |
| | Migrations run | | |
| | Verification complete | | |
| | Monitoring period ended | | |
| | Release complete | | |

---

## Issues Encountered

Document any issues here:

```
[Issues go here]
```

---

## Sign-off

**Release completed by**: __________ 
**Time**: __________ (UTC)
**Final Status**: ☐ Success ☐ Rolled Back ☐ Partial
