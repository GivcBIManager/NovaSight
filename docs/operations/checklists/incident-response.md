# Incident Response Checklist

Use this checklist during production incidents to ensure consistent response.

---

## Incident Details

| Field | Value |
|-------|-------|
| **Incident ID** | |
| **Start Time (UTC)** | |
| **Severity** | SEV1 / SEV2 / SEV3 / SEV4 |
| **Incident Commander** | |
| **Summary** | |

---

## Phase 1: Detection & Acknowledgment (0-5 min)

- [ ] Alert received
- [ ] Alert acknowledged in PagerDuty
- [ ] Joined #incidents Slack channel
- [ ] Posted initial status

```markdown
🚨 **Incident Started**
- Time: [UTC timestamp]
- Severity: SEV[X]
- Summary: [brief description]
- Status: Investigating
- Commander: @[your-handle]
```

## Phase 2: Assessment (5-15 min)

- [ ] Identify affected services
- [ ] Determine user impact scope
- [ ] Assign severity level
- [ ] Create incident channel (if SEV1/SEV2)

### Quick Diagnostics

```bash
# System status
kubectl get pods -n novasight-prod
kubectl get events -n novasight-prod --sort-by='.lastTimestamp' | tail -10

# Recent logs
kubectl logs -l app=backend -n novasight-prod --tail=100 --since=5m | grep -i error

# Resource usage
kubectl top pods -n novasight-prod
```

### Impact Assessment

- [ ] Which services are affected?
- [ ] How many users are impacted?
- [ ] What is the business impact?
- [ ] Is data at risk?

## Phase 3: Communication (ongoing)

- [ ] Update status page
- [ ] Notify stakeholders (if SEV1/SEV2)
- [ ] Set update frequency (every 15-30 min for SEV1/SEV2)

```bash
./scripts/post-status.sh --status "investigating" --message "[description]"
```

## Phase 4: Mitigation (as needed)

### Quick Fixes

| Issue | Fix Command |
|-------|-------------|
| Pod crashes | `kubectl rollout restart deployment/backend -n novasight-prod` |
| High load | `kubectl scale deployment/backend --replicas=15 -n novasight-prod` |
| Bad deployment | `kubectl rollout undo deployment/backend -n novasight-prod` |
| Stuck pods | `kubectl delete pod <name> -n novasight-prod` |

- [ ] Mitigation action taken
- [ ] Mitigation verified
- [ ] User impact reduced

## Phase 5: Resolution

- [ ] Root cause identified
- [ ] Fix applied
- [ ] System verified healthy
- [ ] Smoke tests passed

```bash
# Verify health
curl -s https://api.novasight.io/api/v1/health | jq .

# Run smoke tests
npm run test:smoke:prod
```

## Phase 6: Closure

- [ ] Status page updated to resolved
- [ ] Incident channel notified
- [ ] PagerDuty incident resolved
- [ ] Post-mortem scheduled (if SEV1/SEV2)

```markdown
✅ **Incident Resolved**
- Duration: [X hours Y minutes]
- Root Cause: [brief description]
- Resolution: [what fixed it]
- Post-mortem: [scheduled date/time] (if applicable)
```

---

## Escalation Checklist

### When to Escalate

- [ ] Cannot resolve within SLA
- [ ] Need subject matter expertise
- [ ] Security incident suspected
- [ ] Data loss possible
- [ ] Multiple systems affected

### Escalation Contacts

| Time Since Start | SEV1 | SEV2 |
|------------------|------|------|
| 15 min | Team Lead | - |
| 30 min | VP Engineering | Team Lead |
| 1 hour | CTO | VP Engineering |

---

## Timeline Log

| Time (UTC) | Event | Action | Result |
|------------|-------|--------|--------|
| | Alert triggered | | |
| | Acknowledged | | |
| | | | |
| | | | |
| | Resolved | | |

---

## Post-Incident

- [ ] Timeline documented
- [ ] Root cause documented
- [ ] Action items identified
- [ ] Post-mortem meeting scheduled
- [ ] This checklist archived

---

## Lessons Learned (fill after resolution)

**What went well:**
```
[Notes]
```

**What could be improved:**
```
[Notes]
```

**Action items:**
- [ ] [Action item 1] - Owner: ____ - Due: ____
- [ ] [Action item 2] - Owner: ____ - Due: ____
