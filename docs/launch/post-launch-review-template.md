# NovaSight Post-Launch Review Template

> **Version**: 1.0  
> **Last Updated**: 2026-01-29  
> **Owner**: Engineering Lead

## Overview

This document provides the template for conducting the post-launch review meeting, scheduled for T+24h after production deployment.

---

## Meeting Details

| Field | Value |
|-------|-------|
| **Date** | |
| **Time** | |
| **Duration** | 60 minutes |
| **Location/Link** | |
| **Facilitator** | Engineering Lead |
| **Note Taker** | |

### Required Attendees
- [ ] Engineering Lead
- [ ] Operations Lead
- [ ] Security Lead
- [ ] QA Lead
- [ ] Product Owner
- [ ] DevOps Lead

### Optional Attendees
- [ ] CTO
- [ ] Customer Success Lead
- [ ] Support Lead

---

## Agenda

| Time | Topic | Owner | Duration |
|------|-------|-------|----------|
| 0:00 | Introduction & Objectives | Engineering Lead | 5 min |
| 0:05 | Deployment Summary | DevOps Lead | 10 min |
| 0:15 | Metrics Review | SRE Lead | 10 min |
| 0:25 | Issues & Incidents | Operations Lead | 15 min |
| 0:40 | Customer Feedback | Product Owner | 10 min |
| 0:50 | Action Items & Follow-ups | Engineering Lead | 10 min |

---

## 1. Launch Summary

### Deployment Overview

| Metric | Value |
|--------|-------|
| **Launch Date/Time** | |
| **Version Deployed** | |
| **Deployment Duration** | |
| **Rollback Required** | Yes / No |
| **Hotfixes Deployed** | |

### Launch Team

| Role | Name | Contribution |
|------|------|--------------|
| Deployment Lead | | |
| QA Lead | | |
| SRE On-Call | | |
| Security Review | | |

### Timeline Adherence

| Milestone | Planned | Actual | Variance |
|-----------|---------|--------|----------|
| T-24h Check | | | |
| T-12h Briefing | | | |
| T-0 Deployment | | | |
| T+15m Smoke Tests | | | |
| T+1h Monitoring | | | |
| T+4h Check-in | | | |

---

## 2. Metrics Review

### System Performance (First 24 Hours)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Uptime | 99.9% | | ⬜ |
| P50 Latency | < 500ms | | ⬜ |
| P95 Latency | < 2s | | ⬜ |
| P99 Latency | < 5s | | ⬜ |
| Error Rate (5xx) | < 0.1% | | ⬜ |
| Error Rate (4xx) | < 5% | | ⬜ |

### Resource Utilization

| Resource | Average | Peak | Capacity |
|----------|---------|------|----------|
| CPU | | | |
| Memory | | | |
| Network I/O | | | |
| Disk I/O | | | |
| Database Connections | | | |

### Traffic

| Metric | Value |
|--------|-------|
| Total Requests | |
| Unique Users | |
| Peak Concurrent Users | |
| Peak Requests/Second | |

---

## 3. Issues & Incidents

### Issues Encountered

| ID | Description | Severity | Impact | Resolution | Time to Resolve |
|----|-------------|----------|--------|------------|-----------------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

### Incidents

| Incident ID | Summary | Duration | Root Cause | Post-Mortem Required |
|-------------|---------|----------|------------|---------------------|
| | | | | Yes / No |

### Hotfixes Deployed

| Hotfix | Description | Deployed At | Impact |
|--------|-------------|-------------|--------|
| | | | |

---

## 4. Customer Impact

### User Feedback

| Source | Positive | Negative | Neutral |
|--------|----------|----------|---------|
| Support Tickets | | | |
| In-App Feedback | | | |
| Social Media | | | |
| Direct Feedback | | | |

### Notable Feedback

**Positive**:
```
[Quote or summarize positive feedback]
```

**Areas for Improvement**:
```
[Quote or summarize constructive feedback]
```

### Support Metrics

| Metric | Value | vs Baseline |
|--------|-------|-------------|
| Tickets Opened | | |
| Avg Response Time | | |
| Escalations | | |
| Self-Service Resolution | | |

---

## 5. What Went Well ✅

List items that went particularly well during the launch:

1. 
2. 
3. 
4. 
5. 

---

## 6. What Could Be Improved 🔧

List items that could be improved for future launches:

1. 
2. 
3. 
4. 
5. 

---

## 7. Lessons Learned 📚

### Process Improvements

| Area | Current State | Recommendation | Priority |
|------|---------------|----------------|----------|
| | | | |

### Technical Improvements

| Area | Current State | Recommendation | Priority |
|------|---------------|----------------|----------|
| | | | |

### Documentation Updates Needed

- [ ] Update: 
- [ ] Add: 
- [ ] Remove: 

---

## 8. Action Items

| ID | Action Item | Owner | Due Date | Status |
|----|-------------|-------|----------|--------|
| 1 | | | | ⬜ |
| 2 | | | | ⬜ |
| 3 | | | | ⬜ |
| 4 | | | | ⬜ |
| 5 | | | | ⬜ |

---

## 9. Follow-Up Meetings

| Meeting | Purpose | Date | Attendees |
|---------|---------|------|-----------|
| Post-Mortem (if needed) | | | |
| 1-Week Review | | | |
| Process Improvement | | | |

---

## 10. Launch Assessment

### Overall Rating

| Criteria | Rating (1-5) | Comments |
|----------|--------------|----------|
| Planning & Preparation | | |
| Execution | | |
| Communication | | |
| Issue Response | | |
| Documentation | | |
| **Overall** | | |

### Launch Status

- [ ] 🟢 **Successful** - Met all criteria, minor or no issues
- [ ] 🟡 **Successful with Issues** - Met criteria but had notable issues
- [ ] 🟠 **Partial Success** - Some objectives not met
- [ ] 🔴 **Failed** - Required rollback or major issues

### Executive Summary

```
[2-3 sentence summary of the launch for executive communication]
```

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Engineering Lead | | | |
| Operations Lead | | | |
| Product Owner | | | |

---

## Appendix

### A. Detailed Metrics Graphs

[Link to Grafana dashboards or attach screenshots]

### B. Incident Reports

[Link to incident reports if applicable]

### C. Customer Feedback Details

[Link to support ticket summary or feedback compilation]

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-29 | NovaSight Team | Initial release |
