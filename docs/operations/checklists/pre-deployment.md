# Pre-Deployment Checklist

Use this checklist before every deployment to ensure readiness.

---

## Code & Testing

- [ ] All CI/CD pipeline checks passed
- [ ] Code review approved by 2+ reviewers
- [ ] Unit tests passing (coverage ≥ 80%)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] No critical/high security vulnerabilities

## Documentation

- [ ] CHANGELOG.md updated with new version
- [ ] API documentation updated (if applicable)
- [ ] Release notes prepared
- [ ] Breaking changes documented

## Database

- [ ] Database migrations reviewed
- [ ] Migrations tested on staging
- [ ] Rollback migrations verified
- [ ] No destructive migrations (or approved exception)
- [ ] Data backup taken within last 6 hours

## Configuration

- [ ] Environment variables documented
- [ ] Feature flags configured correctly
- [ ] Secrets rotated (if required)
- [ ] ConfigMaps updated (if required)

## Infrastructure

- [ ] Container images built and pushed
- [ ] Image tags verified
- [ ] Resource limits reviewed
- [ ] HPA configuration reviewed

## Dependencies

- [ ] External service dependencies verified
- [ ] Third-party API versions compatible
- [ ] No known upstream issues

## Communication

- [ ] On-call engineer notified
- [ ] Team aware of deployment
- [ ] Maintenance window scheduled (if needed)
- [ ] Customer notification sent (if required)

## Monitoring

- [ ] Monitoring dashboards ready
- [ ] Alert thresholds configured
- [ ] Log aggregation verified
- [ ] Tracing enabled

## Rollback

- [ ] Rollback procedure documented
- [ ] Previous version images available
- [ ] Database rollback scripts ready (if applicable)
- [ ] Team knows rollback triggers

---

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | | | |
| Reviewer | | | |
| DevOps | | | |
| QA (if required) | | | |

---

## Notes

Add any relevant notes or exceptions here:

```
[Notes go here]
```
