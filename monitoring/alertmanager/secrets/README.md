# Alertmanager Secrets

This directory contains secrets for Alertmanager notification channels.

> ⚠️ **IMPORTANT**: Never commit actual secrets to version control. These files should be created during deployment or managed by a secrets management solution.

## Required Secrets

### SMTP Password
```bash
# Create the SMTP password file
echo "your-smtp-password" > smtp_password
chmod 600 smtp_password
```

### Slack Webhook URL
```bash
# Create the Slack webhook URL file
echo "https://hooks.slack.com/services/xxx/xxx/xxx" > slack_webhook
chmod 600 slack_webhook
```

### PagerDuty Service Key
```bash
# Create the PagerDuty service key file
echo "your-pagerduty-service-key" > pagerduty_key
chmod 600 pagerduty_key
```

### PagerDuty Security Key (Optional)
```bash
# Create the PagerDuty security-specific service key
echo "your-security-pagerduty-key" > pagerduty_security_key
chmod 600 pagerduty_security_key
```

## Production Deployment

### Using Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-secrets
  namespace: monitoring
type: Opaque
data:
  smtp_password: <base64-encoded-password>
  slack_webhook: <base64-encoded-webhook-url>
  pagerduty_key: <base64-encoded-key>
  pagerduty_security_key: <base64-encoded-key>
```

### Mount as Volume

```yaml
volumeMounts:
  - name: alertmanager-secrets
    mountPath: /etc/alertmanager/secrets
    readOnly: true
volumes:
  - name: alertmanager-secrets
    secret:
      secretName: alertmanager-secrets
```

### Using HashiCorp Vault

```hcl
# Vault policy for Alertmanager
path "secret/data/novasight/alertmanager/*" {
  capabilities = ["read"]
}
```

### Using AWS Secrets Manager

```bash
# Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name novasight/alertmanager/smtp-password \
  --secret-string "your-smtp-password"

aws secretsmanager create-secret \
  --name novasight/alertmanager/slack-webhook \
  --secret-string "https://hooks.slack.com/services/xxx/xxx/xxx"

aws secretsmanager create-secret \
  --name novasight/alertmanager/pagerduty-key \
  --secret-string "your-pagerduty-key"
```

## File Permissions

All secret files must have restricted permissions:

```bash
chmod 600 /etc/alertmanager/secrets/*
chown alertmanager:alertmanager /etc/alertmanager/secrets/*
```

## Rotation

Secret rotation should be performed:

1. **SMTP Password**: Every 90 days
2. **Slack Webhook**: When compromised or team changes
3. **PagerDuty Keys**: Every 180 days or when escalation policy changes

## Verification

To verify secrets are correctly mounted:

```bash
# Check file existence (don't print contents!)
ls -la /etc/alertmanager/secrets/

# Verify Alertmanager can read secrets (check logs)
kubectl logs -n monitoring alertmanager-0 | grep -i secret
```

## Troubleshooting

### "permission denied" errors
- Ensure files have `600` permissions
- Verify ownership matches Alertmanager user

### "file not found" errors
- Check volume mounts in deployment
- Verify secret names match configuration

### Alerts not sending
- Check Alertmanager logs: `kubectl logs -n monitoring alertmanager-0`
- Verify webhook URLs are valid
- Test SMTP connectivity: `telnet smtp.gmail.com 587`
