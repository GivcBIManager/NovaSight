# User Management

This guide covers how to manage users, roles, and permissions in NovaSight.

## Overview

NovaSight uses Role-Based Access Control (RBAC) to manage permissions. As an administrator, you can:

- Create and manage users
- Assign roles and permissions
- Configure authentication settings
- Monitor user activity

---

## Accessing User Management

1. Click **Admin** in the sidebar
2. Select **Users**

You'll see a list of all users in your tenant.

---

## Managing Users

### Creating a User

1. Click **+ Add User**
2. Fill in user details:

```yaml
User Details:
  Email: alice@company.com
  First Name: Alice
  Last Name: Smith
  Role: Analyst
  
Options:
  Send Welcome Email: true
  Require Password Change: true
```

3. Click **Create User**

### Editing a User

1. Find the user in the list
2. Click the **Edit** icon (✏️)
3. Update details
4. Click **Save**

### Deactivating a User

1. Find the user
2. Click the **More** menu (⋮)
3. Select **Deactivate**

!!! note "Deactivation vs Deletion"
    Deactivated users can't log in but their data and audit history are preserved. Deletion is permanent.

### Deleting a User

1. Find the user
2. Click **More** (⋮) > **Delete**
3. Confirm deletion

!!! warning
    Deleting a user removes them permanently. Consider deactivation instead.

---

## Role Management

### Default Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all features |
| **Analyst** | Create/edit dashboards, run queries |
| **Viewer** | View shared dashboards only |
| **Developer** | API access, connections |

### Creating Custom Roles

1. Go to **Admin** > **Roles**
2. Click **+ Create Role**
3. Configure permissions:

```yaml
Role: Senior Analyst
Description: Advanced analysts with data source access

Permissions:
  Dashboards:
    View: true
    Create: true
    Edit: own
    Delete: own
    Share: true
    
  Data Sources:
    View: true
    Create: false
    Edit: false
    Test Connection: true
    
  Semantic Layer:
    View: true
    Create: true
    Edit: own
    
  Admin:
    View Users: true
    Manage Users: false
    View Audit: true
```

4. Click **Create**

### Permission Categories

| Category | Permissions |
|----------|-------------|
| **Dashboards** | View, Create, Edit, Delete, Share |
| **Data Sources** | View, Create, Edit, Delete, Test |
| **Semantic Layer** | View, Create, Edit, Delete |
| **Queries** | Execute, View SQL, Export |
| **Admin** | Users, Roles, Audit, Settings |

### Role Hierarchy

Roles can inherit from parent roles:

```
Admin
├── Developer
│   └── Senior Analyst
│       └── Analyst
│           └── Viewer
```

---

## Bulk Operations

### Import Users

Import multiple users via CSV:

1. Click **Import Users**
2. Download the template
3. Fill in user data:

```csv
email,first_name,last_name,role
alice@company.com,Alice,Smith,Analyst
bob@company.com,Bob,Jones,Viewer
carol@company.com,Carol,White,Admin
```

4. Upload and review
5. Click **Import**

### Export Users

1. Click **Export**
2. Choose format (CSV or Excel)
3. Download user list

### Bulk Role Assignment

1. Select multiple users (checkboxes)
2. Click **Bulk Actions**
3. Select **Change Role**
4. Choose new role
5. Confirm

---

## Authentication Settings

### Password Policy

Configure password requirements:

```yaml
Password Policy:
  Minimum Length: 12
  Require Uppercase: true
  Require Lowercase: true
  Require Numbers: true
  Require Symbols: true
  Prevent Reuse: 5  # last N passwords
  Expiration: 90 days
```

### Session Settings

```yaml
Session Settings:
  Timeout: 60 minutes  # Inactive timeout
  Max Duration: 12 hours
  Single Session: false  # Allow multiple devices
```

### Multi-Factor Authentication

Enable MFA for enhanced security:

1. Go to **Admin** > **Security**
2. Enable **Require MFA**
3. Choose MFA methods:
   - Authenticator app (TOTP)
   - SMS
   - Email

---

## SSO Integration

### Supported Providers

| Provider | Protocol |
|----------|----------|
| Okta | SAML 2.0, OIDC |
| Azure AD | SAML 2.0, OIDC |
| Google Workspace | OIDC |
| OneLogin | SAML 2.0 |
| Custom SAML | SAML 2.0 |
| Custom OIDC | OpenID Connect |

### Configuring SAML

1. Go to **Admin** > **Authentication** > **SAML**
2. Configure:

```yaml
SAML Configuration:
  Entity ID: https://novasight.example.com/saml
  SSO URL: https://idp.example.com/sso
  Certificate: [Upload IDP certificate]
  
  Attribute Mapping:
    Email: email
    First Name: firstName
    Last Name: lastName
    Role: groups
```

3. Download SP metadata for your IDP
4. Test connection
5. Enable

### Configuring OIDC

```yaml
OIDC Configuration:
  Provider URL: https://auth.example.com
  Client ID: your-client-id
  Client Secret: ********
  Scopes: openid profile email
  
  Attribute Mapping:
    Email: email
    Name: name
```

---

## User Activity

### View Activity

1. Go to **Admin** > **Users**
2. Click on a user
3. View **Activity** tab

```yaml
Recent Activity:
  - 2024-01-15 09:30: Logged in
  - 2024-01-15 09:35: Viewed "Sales Dashboard"
  - 2024-01-15 10:15: Ran query "Total sales by region"
  - 2024-01-15 10:45: Exported data (CSV)
  - 2024-01-15 11:00: Logged out
```

### User Statistics

View aggregate statistics:

```yaml
User Stats:
  Last Login: 2024-01-15 09:30
  Login Count: 145
  Dashboards Viewed: 23
  Queries Run: 567
  Active Days: 45
```

---

## Best Practices

### Security

| Practice | Description |
|----------|-------------|
| Least privilege | Assign minimum necessary permissions |
| Regular review | Audit user access quarterly |
| SSO when possible | Centralize authentication |
| MFA required | Enable for all users |

### Organization

| Practice | Description |
|----------|-------------|
| Naming conventions | Consistent role names |
| Documentation | Document custom roles |
| Lifecycle process | Define onboarding/offboarding |

---

## Next Steps

- [Tenant Settings](tenant-settings.md)
- [Security and Audit](security-audit.md)
- [Sharing Permissions](../dashboards/sharing-permissions.md)
