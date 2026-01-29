# Security and Audit Guide

This guide covers security features and audit capabilities for administrators.

## Overview

NovaSight provides comprehensive security features including:
- Role-based access control (RBAC)
- Audit logging
- Data encryption
- Compliance support

---

## Audit Logging

NovaSight maintains comprehensive audit logs for compliance and security monitoring.

### What's Logged

| Category | Events |
|----------|--------|
| Authentication | Login, logout, failed attempts, password changes, MFA events |
| Data Access | Query execution, data exports, dashboard views |
| Configuration | Data source changes, permission updates, setting changes |
| Administration | User creation, role changes, tenant settings |
| Security | API key creation, permission denials, suspicious activity |

### Viewing Audit Logs

1. Navigate to **Admin** > **Audit Logs**
2. Use filters to narrow results:
   - User
   - Action type
   - Date range
   - Severity
   - Resource type

### Log Entry Details

```yaml
Audit Log Entry:
  Timestamp: 2024-01-15T09:30:45Z
  User: alice@company.com
  Action: QUERY_EXECUTED
  Resource: Dashboard "Sales Overview"
  
  Details:
    Query ID: q-12345
    Duration: 2.3s
    Rows Returned: 150
    
  Context:
    IP Address: 10.0.1.50
    User Agent: Chrome/120.0
    Session ID: sess-abc123
```

### Log Retention

```yaml
Retention Policy:
  Default: 90 days
  Security Events: 365 days
  Compliance Events: 7 years
  
  Export:
    Format: JSON, CSV
    Encryption: AES-256
    Destination: S3, SFTP, SIEM
```

### Log Export

Export logs for archival or SIEM integration:

1. Go to **Admin** > **Audit Logs**
2. Apply filters
3. Click **Export**
4. Choose format and destination

---

## Role-Based Access Control

### Default Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all features |
| **Analyst** | Create/edit dashboards, run queries |
| **Viewer** | View shared dashboards only |

### Permission Matrix

| Permission | Admin | Analyst | Viewer |
|------------|-------|---------|--------|
| View dashboards | ✅ | ✅ | ✅ (shared only) |
| Create dashboards | ✅ | ✅ | ❌ |
| Edit all dashboards | ✅ | ❌ | ❌ |
| Manage data sources | ✅ | ❌ | ❌ |
| View semantic layer | ✅ | ✅ | ❌ |
| Edit semantic layer | ✅ | ✅ | ❌ |
| Run queries | ✅ | ✅ | ❌ |
| Export data | ✅ | ✅ | Configurable |
| Manage users | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ |
| API access | ✅ | Configurable | ❌ |

### Custom Roles

Create custom roles with granular permissions:

1. Go to **Admin** > **Roles**
2. Click **Create Role**
3. Select permissions:
   - Data Sources: View, Create, Edit, Delete
   - Semantic Layer: View, Create, Edit, Delete
   - Dashboards: View, Create, Edit, Delete, Share
   - Users: View, Create, Edit, Delete
   - Admin: Access admin panel

### Permission Inheritance

Roles can inherit from parent roles:

```
Admin (full access)
└── Analyst (create/edit)
    └── Viewer (view only)
```

---

## Row-Level Security

Restrict data access at the row level.

### Configuration

```yaml
Row Level Security:
  Table: orders
  
  Rules:
    - Name: "Regional Access"
      Filter: |
        region IN ({{ user.allowed_regions }})
      Apply To:
        Roles: ["Regional Manager", "Sales Rep"]
        
    - Name: "Team Access"
      Filter: |
        team_id = {{ user.team_id }}
      Apply To:
        Users: ["analyst@company.com"]
        
    - Name: "Full Access"
      Filter: "1=1"
      Apply To:
        Roles: ["Admin", "Executive"]
```

### User Attributes

Define user attributes for RLS:

```yaml
User Attributes:
  alice@company.com:
    team_id: "team-123"
    allowed_regions: ["North", "South"]
    department: "Sales"
    
  bob@company.com:
    team_id: "team-456"
    allowed_regions: ["East"]
    department: "Marketing"
```

---

## Data Encryption

### Encryption at Rest

```yaml
Encryption at Rest:
  Enabled: true
  Algorithm: AES-256
  Key Management: AWS KMS
  
  Encrypted Data:
    - Database credentials
    - API keys
    - User passwords
    - Cached query results
```

### Encryption in Transit

```yaml
Encryption in Transit:
  TLS Version: 1.3
  Certificate: Valid
  HSTS: Enabled
  
  Internal Traffic:
    mTLS: Enabled
```

---

## API Security

### API Key Management

```yaml
API Keys:
  Rate Limit: 100 requests/minute
  Expiration: 90 days
  Scopes: Required
  
  Allowed Scopes:
    - read:dashboards
    - write:dashboards
    - read:queries
    - execute:queries
    - admin:users
```

### Creating API Keys

1. Go to **Admin** > **API Keys**
2. Click **Create API Key**
3. Configure:

```yaml
API Key:
  Name: "Integration Key"
  Description: "For Slack integration"
  Expiration: 90 days
  
  Scopes:
    - read:dashboards
    - read:queries
    
  Restrictions:
    IP Whitelist:
      - 10.0.0.0/8
      - 192.168.1.0/24
```

---

## Security Best Practices

### User Management

| Practice | Description |
|----------|-------------|
| ✅ Use strong password policies | Min 12 chars, complexity required |
| ✅ Enable MFA | For all users, especially admins |
| ✅ Review inactive users | Deactivate unused accounts |
| ✅ Use least-privilege access | Grant minimum permissions |
| ✅ Regular access reviews | Audit quarterly |

### Data Source Security

| Practice | Description |
|----------|-------------|
| ✅ Use read-only credentials | Prevent data modifications |
| ✅ Rotate credentials regularly | Every 90 days |
| ✅ Limit network access | Use firewalls/VPNs |
| ✅ Enable SSL for all connections | Encrypt data in transit |
| ✅ Audit connection usage | Monitor for anomalies |

### Dashboard Security

| Practice | Description |
|----------|-------------|
| ✅ Review sharing permissions | Audit who has access |
| ✅ Use row-level security | For sensitive data |
| ✅ Enable watermarks | For exports |
| ✅ Set data classification | Label sensitive dashboards |

---

## Compliance Features

### SOC 2 Support

- ✅ Audit logging
- ✅ Access controls
- ✅ Encryption at rest and in transit
- ✅ Regular security assessments
- ✅ Incident response procedures

### GDPR Support

- ✅ Data export capabilities (right to portability)
- ✅ User data deletion (right to erasure)
- ✅ Consent management
- ✅ Data location controls
- ✅ Privacy by design

### HIPAA Support

- ✅ Access controls
- ✅ Audit trails
- ✅ Encryption
- ✅ BAA available

---

## Security Monitoring

### Alert Configuration

Set up security alerts:

```yaml
Security Alerts:
  - Name: "Failed Login Attempts"
    Trigger: 5 failed attempts in 10 minutes
    Actions:
      - Lock account
      - Email admin
      - Log to SIEM
      
  - Name: "Unusual Data Export"
    Trigger: Export > 10000 rows
    Actions:
      - Email admin
      - Require approval
      
  - Name: "Off-Hours Access"
    Trigger: Login outside business hours
    Actions:
      - Require MFA
      - Log event
```

### Security Dashboard

View security metrics:

1. Go to **Admin** > **Security Dashboard**
2. See:
   - Failed login attempts
   - Suspicious activities
   - Permission denials
   - Data access patterns

---

## Incident Response

### Security Incident Handling

1. **Detection**: Automated alerts or user report
2. **Assessment**: Evaluate severity and scope
3. **Containment**: Disable affected accounts/access
4. **Investigation**: Review audit logs
5. **Resolution**: Fix vulnerabilities
6. **Communication**: Notify stakeholders
7. **Post-Incident**: Update procedures

### Emergency Actions

| Action | Steps |
|--------|-------|
| Lock all sessions | Admin > Security > Emergency Lock |
| Disable API access | Admin > API > Disable All |
| Reset all passwords | Admin > Users > Force Password Reset |
| Export audit logs | Admin > Audit > Emergency Export |

---

## Generating Reports

### Access Report

View who accessed what:

1. Go to **Admin** > **Reports** > **Access Report**
2. Select date range
3. Choose scope (all users, specific role, etc.)
4. Generate

### Change Audit Report

Track configuration changes:

1. Go to **Admin** > **Reports** > **Change Audit**
2. Filter by change type
3. Generate

### Compliance Report

For auditors:

1. Go to **Admin** > **Reports** > **Compliance**
2. Select framework (SOC 2, GDPR, etc.)
3. Generate comprehensive report

---

## Next Steps

- [User Management](user-management.md)
- [Tenant Settings](tenant-settings.md)
- [Troubleshooting](../../troubleshooting/common-issues.md)
