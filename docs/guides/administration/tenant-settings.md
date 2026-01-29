# Tenant Settings

This guide covers how to configure tenant-level settings in NovaSight.

## Overview

As a tenant administrator, you can configure:
- Organization settings
- Branding and appearance
- Feature settings
- Resource quotas
- Integration settings

---

## Accessing Tenant Settings

1. Click **Admin** in the sidebar
2. Select **Settings**

---

## Organization Settings

### General Information

```yaml
Organization:
  Name: Acme Corporation
  Display Name: Acme BI Portal
  Subdomain: acme.novasight.io
  
Contact:
  Admin Email: bi-admin@acme.com
  Support Email: bi-support@acme.com
  
Timezone:
  Default: America/New_York
  Allow User Override: true
```

### Locale Settings

```yaml
Locale:
  Language: English
  Date Format: MM/DD/YYYY
  Time Format: 12-hour
  First Day of Week: Sunday
  
  Number Format:
    Decimal Separator: .
    Thousands Separator: ,
    
  Currency:
    Default: USD
    Symbol Position: before
```

---

## Branding

### Logo and Colors

1. Go to **Settings** > **Branding**
2. Configure visual identity:

```yaml
Branding:
  Logo:
    Primary: [Upload logo]
    Favicon: [Upload favicon]
    Login Page: [Upload logo]
    
  Colors:
    Primary: "#3B82F6"
    Secondary: "#10B981"
    Accent: "#F59E0B"
    
  Theme:
    Default: light
    Allow User Choice: true
```

### Custom CSS

Add custom styles (advanced):

```css
/* Custom CSS */
.dashboard-header {
  background: linear-gradient(to right, #3B82F6, #10B981);
}

.kpi-widget .value {
  font-family: 'Inter', sans-serif;
}
```

### Login Page

Customize the login experience:

```yaml
Login Page:
  Background: [Upload image]
  Welcome Text: "Welcome to Acme Analytics"
  Show Logo: true
  Terms Link: https://acme.com/terms
  Privacy Link: https://acme.com/privacy
```

---

## Feature Settings

### Enable/Disable Features

```yaml
Features:
  Natural Language Queries: true
  SQL Editor: true
  Data Export: true
  Dashboard Sharing: true
  API Access: true
  Embedding: true
  
  Advanced:
    Custom SQL Connections: false
    dbt Integration: true
    Airflow Integration: true
```

### Query Settings

```yaml
Query Settings:
  Max Query Timeout: 300 seconds
  Max Rows Returned: 100000
  Allow Raw SQL: false
  
  Caching:
    Enabled: true
    TTL: 15 minutes
    Max Cache Size: 1 GB
```

### Export Settings

```yaml
Export Settings:
  Allowed Formats:
    - CSV
    - Excel
    - PDF
    - PNG
    
  Limits:
    Max Export Rows: 50000
    
  Watermark:
    Enabled: true
    Text: "Confidential"
```

---

## Resource Quotas

### Storage Quotas

```yaml
Storage Quotas:
  Total Storage: 100 GB
  Per User Storage: 5 GB
  
  Current Usage:
    Total Used: 45 GB (45%)
    Largest Dashboard: 2.3 GB
```

### Query Quotas

```yaml
Query Quotas:
  Concurrent Queries: 20
  Queries Per Day: 10000
  
  Per User:
    Concurrent: 5
    Per Hour: 100
```

### User Quotas

```yaml
User Quotas:
  Max Users: 100
  Max Admins: 10
  Max API Keys: 50
  
  Current:
    Active Users: 67
    Pending Invites: 5
```

---

## Data Governance

### Data Retention

```yaml
Data Retention:
  Query Results: 90 days
  Audit Logs: 365 days
  Deleted Items: 30 days (recoverable)
  
  Automatic Cleanup:
    Orphaned Data: Weekly
    Temporary Files: Daily
```

### Data Classification

```yaml
Data Classification:
  Enabled: true
  
  Levels:
    - Name: Public
      Color: "#10B981"
      Restrictions: none
      
    - Name: Internal
      Color: "#3B82F6"
      Restrictions: no_export
      
    - Name: Confidential
      Color: "#F59E0B"
      Restrictions: no_export, watermark
      
    - Name: Restricted
      Color: "#EF4444"
      Restrictions: no_export, no_share, audit_access
```

---

## Integrations

### Email Settings

```yaml
Email:
  SMTP Server: smtp.company.com
  Port: 587
  Use TLS: true
  Username: noreply@company.com
  Password: ********
  
  From Address: noreply@company.com
  From Name: NovaSight
```

### Notification Channels

```yaml
Notifications:
  Email:
    Enabled: true
    
  Slack:
    Enabled: true
    Webhook URL: https://hooks.slack.com/...
    Default Channel: #bi-alerts
    
  Webhook:
    Enabled: true
    URL: https://api.company.com/webhooks/novasight
```

### API Settings

```yaml
API:
  Rate Limit:
    Requests Per Minute: 100
    Burst: 50
    
  CORS:
    Allowed Origins:
      - https://app.company.com
      - https://internal.company.com
      
  API Keys:
    Max Per User: 5
    Expiration: 90 days
```

---

## Backup and Recovery

### Backup Settings

```yaml
Backups:
  Automatic:
    Enabled: true
    Frequency: Daily
    Retention: 30 days
    
  Include:
    - Dashboards
    - Semantic Layer
    - User Settings
    - Audit Logs
```

### Export Tenant Data

1. Go to **Settings** > **Data Management**
2. Click **Export All Data**
3. Choose format and scope
4. Download

### Import Tenant Data

For migration or recovery:

1. Click **Import Data**
2. Upload backup file
3. Map users and resources
4. Confirm import

---

## Maintenance

### System Status

View system health:

```yaml
System Status:
  API: Healthy
  Database: Healthy
  Cache: Healthy
  Background Jobs: Healthy
  
  Last Incident: None
  Uptime: 99.9%
```

### Maintenance Windows

Schedule maintenance:

```yaml
Maintenance:
  Schedule:
    Day: Sunday
    Time: 02:00 - 04:00 UTC
    
  Notifications:
    Advance Notice: 24 hours
    Channels: email, in-app
```

---

## Audit and Compliance

### Audit Settings

```yaml
Audit:
  Enabled: true
  
  Log Events:
    Authentication: true
    Data Access: true
    Configuration Changes: true
    Export Operations: true
    
  Retention: 365 days
  
  Export:
    Format: JSON
    Encryption: AES-256
```

### Compliance Reports

Generate compliance reports:

1. Go to **Admin** > **Compliance**
2. Select report type:
   - Access Report
   - Data Usage Report
   - Change Audit Report
3. Choose date range
4. Generate and download

---

## Next Steps

- [Security and Audit](security-audit.md)
- [User Management](user-management.md)
- [Troubleshooting](../../troubleshooting/common-issues.md)
