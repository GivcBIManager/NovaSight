# Sharing and Permissions

This guide covers how to share dashboards and manage access permissions in NovaSight.

## Overview

NovaSight provides granular control over who can:
- View dashboards
- Edit dashboards
- Share dashboards
- Export data

---

## Sharing Options

### Share with Users

Share with specific individuals:

1. Open your dashboard
2. Click **Share** button
3. Select **Add Users**
4. Search and select users
5. Choose permission level
6. Click **Share**

```yaml
Share with Users:
  Users:
    - alice@company.com: view
    - bob@company.com: edit
    - carol@company.com: view
```

### Share with Roles

Share with entire roles/groups:

```yaml
Share with Roles:
  Roles:
    - Analysts: edit
    - Executives: view
    - Sales Team: view
```

### Share with Everyone

Make available to all tenant users:

```yaml
Visibility:
  Type: tenant_wide
  Permission: view
```

---

## Permission Levels

### View

Recipients can:
- ✅ View the dashboard
- ✅ Interact with filters
- ✅ Export data (if enabled)
- ❌ Edit widgets
- ❌ Change settings
- ❌ Share with others

### Edit

Recipients can:
- ✅ All "View" permissions
- ✅ Add/edit/delete widgets
- ✅ Change layout
- ✅ Modify settings
- ❌ Delete dashboard
- ❌ Change sharing settings

### Admin

Recipients can:
- ✅ All "Edit" permissions
- ✅ Delete dashboard
- ✅ Manage sharing
- ✅ Transfer ownership

---

## Shareable Links

### Generate Link

Create a shareable URL:

1. Click **Share**
2. Select **Create Link**
3. Configure options:

```yaml
Shareable Link:
  Expiration: 30 days | never
  Password Protected: true
  Allow Export: false
  
  Filters Locked:
    - date_range: "Last 30 days"
```

### Link Types

| Type | Authentication | Use Case |
|------|---------------|----------|
| Internal Link | Required | Share within organization |
| Guest Link | Optional password | External stakeholders |
| Embed Link | None (read-only) | Website embedding |

---

## Embedding

### Embed in Applications

Get embed code for external use:

1. Click **Share** > **Embed**
2. Copy the embed code:

```html
<iframe
  src="https://novasight.example.com/embed/dashboard/abc123"
  width="100%"
  height="600"
  frameborder="0"
  allowfullscreen
></iframe>
```

### Embed Options

```yaml
Embed Settings:
  Theme: light | dark | auto
  Show Title: true
  Show Filters: true
  Interactive: true
  
  Security:
    Allowed Domains:
      - "https://intranet.company.com"
      - "https://app.company.com"
```

---

## Row-Level Security

Restrict data visibility per user.

### Configuration

Define RLS in the semantic layer:

```yaml
Row Level Security:
  Table: orders
  
  Rules:
    - Name: "Sales reps see their orders"
      Filter: |
        sales_rep_id = {{ user.employee_id }}
      Apply To:
        Roles: ["Sales"]
        
    - Name: "Managers see team orders"
      Filter: |
        team_id = {{ user.team_id }}
      Apply To:
        Roles: ["Manager"]
        
    - Name: "Admins see all"
      Filter: "1=1"
      Apply To:
        Roles: ["Admin"]
```

### How It Works

1. User accesses dashboard
2. NovaSight checks user's role
3. Applies matching RLS filter
4. User only sees permitted data

---

## Data Export Controls

### Export Permissions

Control what users can export:

```yaml
Export Settings:
  Allow Export: true
  
  Formats:
    CSV: true
    Excel: true
    PDF: true
    Image: true
    
  Limits:
    Max Rows: 10000
    
  Watermark:
    Enabled: true
    Text: "Confidential - {{ user.email }}"
```

### Disable Export

For sensitive dashboards:

```yaml
Export Settings:
  Allow Export: false
```

---

## Audit Trail

### Viewing Access History

See who accessed your dashboard:

1. Go to dashboard **Settings**
2. Click **Activity Log**

```yaml
Activity Log:
  - User: alice@company.com
    Action: viewed
    Time: 2024-01-15 09:30:00
    
  - User: bob@company.com
    Action: edited
    Time: 2024-01-15 10:15:00
    
  - User: carol@company.com
    Action: exported (CSV)
    Time: 2024-01-15 11:00:00
```

### Access Reports

Generate access reports:

1. Go to **Admin** > **Reports**
2. Select **Dashboard Access**
3. Choose date range
4. Export or schedule

---

## Ownership Transfer

### Transfer Dashboard

Change dashboard ownership:

1. Go to **Settings** > **General**
2. Click **Transfer Ownership**
3. Select new owner
4. Confirm transfer

!!! warning
    Transferring ownership removes your admin access unless you're explicitly added back.

---

## Best Practices

### Security

| Tip | Description |
|-----|-------------|
| Least privilege | Grant minimum necessary access |
| Regular review | Audit access quarterly |
| Expire links | Set expiration on shared links |
| RLS for sensitive data | Use row-level security |

### Organization

| Tip | Description |
|-----|-------------|
| Use folders | Organize by team/project |
| Clear naming | Descriptive dashboard names |
| Document access | Note who should have access |

### Governance

| Tip | Description |
|-----|-------------|
| Ownership policy | Define dashboard ownership rules |
| Approval workflow | Require approval for wide sharing |
| Data classification | Label sensitive dashboards |

---

## Troubleshooting

### "Access Denied"

1. Verify user is in correct role
2. Check dashboard sharing settings
3. Confirm RLS rules aren't excluding data

### "No Data Shown"

1. Check RLS filter matches user attributes
2. Verify underlying data source access
3. Review filter settings

### Embed Not Loading

1. Verify domain is in allowlist
2. Check embed link hasn't expired
3. Ensure correct embed code is used

---

## Next Steps

- [Building Dashboards](building-dashboards.md)
- [Widget Types](widget-types.md)
- [User Management](../administration/user-management.md)
