# Security Incident Response Checklist

Use this checklist when responding to security incidents.

---

## ⚠️ CRITICAL: Read First

1. **Do not** discuss incident details in public channels
2. **Do** use encrypted communication
3. **Do** preserve all evidence
4. **Do not** attempt to "fix" without Security team involvement
5. **Escalate immediately** to Security team

---

## Incident Classification

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **P1** | Active breach, data exfiltration | Immediate | Unauthorized access, ransomware |
| **P2** | Confirmed vulnerability exploitation | 1 hour | SQL injection, RCE attempt |
| **P3** | Security policy violation | 4 hours | Credential exposure, misconfig |
| **P4** | Potential security issue | 24 hours | Suspicious activity, alerts |

---

## Incident Details

| Field | Value |
|-------|-------|
| **Incident ID** | SEC-YYYYMMDD-XXX |
| **Reported By** | |
| **Report Time (UTC)** | |
| **Severity** | P1 / P2 / P3 / P4 |
| **Type** | |
| **Security Lead** | |

---

## Phase 1: Initial Response (0-15 min)

### Immediate Actions

- [ ] Alert acknowledged
- [ ] Security team notified (Slack: #security-incidents)
- [ ] Incident channel created (private)
- [ ] Do NOT announce in public channels

### Initial Assessment

- [ ] What type of incident?
  - [ ] Unauthorized access
  - [ ] Data breach
  - [ ] Malware/Ransomware
  - [ ] Credential compromise
  - [ ] Vulnerability exploitation
  - [ ] Insider threat
  - [ ] Other: __________

- [ ] What is potentially affected?
  - [ ] User data
  - [ ] Customer data
  - [ ] Financial data
  - [ ] Infrastructure
  - [ ] Source code
  - [ ] Credentials/Secrets

---

## Phase 2: Containment (15-60 min)

### Preserve Evidence

- [ ] Take screenshots of anomalies
- [ ] Export relevant logs
- [ ] Document timeline
- [ ] **DO NOT** modify systems without approval

```bash
# Export logs (example)
kubectl logs -l app=backend -n novasight-prod --since=24h > backend_logs_$(date +%Y%m%d%H%M).log
```

### Containment Actions (Security Lead Approval Required)

| Action | Approved By | Time |
|--------|-------------|------|
| Revoke compromised credentials | | |
| Block suspicious IPs | | |
| Isolate affected systems | | |
| Disable affected accounts | | |

#### Common Containment Commands

```bash
# Block IP in WAF/Firewall
# [Contact Security Team]

# Revoke JWT tokens (requires Redis)
kubectl exec -it redis-0 -n novasight-prod -- redis-cli FLUSHDB
# WARNING: This logs out ALL users

# Disable user account
# [Via Admin API with Security approval]

# Rotate secrets
./scripts/rotate-secrets.sh --emergency
```

---

## Phase 3: Investigation

### Log Analysis

- [ ] Application logs reviewed
- [ ] Access logs reviewed
- [ ] Audit logs reviewed
- [ ] Network logs reviewed

### Key Questions

- [ ] When did the incident start?
- [ ] How was access gained?
- [ ] What data was accessed/exfiltrated?
- [ ] Which systems were affected?
- [ ] Is the threat still active?
- [ ] Are there other compromised accounts/systems?

### Evidence Collection

| Evidence Type | Location | Collected By | Time |
|---------------|----------|--------------|------|
| Application logs | | | |
| Access logs | | | |
| Audit trail | | | |
| Network captures | | | |

---

## Phase 4: Eradication

### Remove Threat (Security Lead Approval Required)

- [ ] Malicious code removed
- [ ] Backdoors identified and removed
- [ ] Compromised credentials rotated
- [ ] Affected systems patched
- [ ] Vulnerability remediated

### Verification

- [ ] No remaining indicators of compromise
- [ ] Security scans clean
- [ ] Monitoring shows no suspicious activity

---

## Phase 5: Recovery

- [ ] Affected systems restored from clean backup
- [ ] Services restored gradually
- [ ] Enhanced monitoring enabled
- [ ] Security team verification

---

## Phase 6: Communication

### Internal Notification

- [ ] Security team fully briefed
- [ ] Engineering leadership notified
- [ ] Executive team notified (P1/P2)
- [ ] Legal notified (if data breach)

### External Notification (if required)

- [ ] Legal review of notification requirements
- [ ] Affected customers identified
- [ ] Customer notification drafted
- [ ] Regulatory notification (if required)
  - [ ] GDPR (72 hours)
  - [ ] Other: __________

---

## Phase 7: Post-Incident

- [ ] Incident report completed
- [ ] Root cause analysis performed
- [ ] Remediation actions identified
- [ ] Timeline documented
- [ ] Evidence preserved for potential legal action
- [ ] Post-mortem scheduled

### Security Improvements

| Improvement | Priority | Owner | Due Date |
|-------------|----------|-------|----------|
| | | | |
| | | | |
| | | | |

---

## Emergency Contacts

| Role | Name | Phone | Encrypted Channel |
|------|------|-------|-------------------|
| Security Lead | Alice Brown | +1-555-0104 | Signal |
| VP Engineering | Emily Johnson | +1-555-0100 | Signal |
| Legal Counsel | [Name] | +1-555-0XXX | Signal |
| CEO | [Name] | +1-555-0XXX | Signal |

### External Resources

| Resource | Contact |
|----------|---------|
| Incident Response Firm | [Contracted firm] |
| Law Enforcement (if needed) | FBI Cyber: 1-800-CALL-FBI |
| Legal Counsel | [Firm name] |

---

## Classification Guide

**CONFIDENTIAL**: This document and all incident details are classified as CONFIDENTIAL. 
Do not share outside of authorized personnel.
