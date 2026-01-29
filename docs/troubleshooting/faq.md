# Frequently Asked Questions

Answers to commonly asked questions about NovaSight.

---

## General

### What is NovaSight?

NovaSight is a multi-tenant Business Intelligence platform that enables you to:
- Connect to multiple data sources
- Build semantic layers over your data
- Query data using natural language
- Create and share interactive dashboards

### What data sources are supported?

NovaSight supports:
- **Databases**: PostgreSQL, MySQL, ClickHouse, SQL Server, Oracle
- **Data Warehouses**: Snowflake, BigQuery, Redshift
- **Cloud Storage**: Amazon S3, Google Cloud Storage, Azure Blob
- **APIs**: REST APIs, GraphQL

### Is my data secure?

Yes. NovaSight provides:
- Encryption at rest (AES-256) and in transit (TLS 1.3)
- Role-based access control
- Row-level security
- Audit logging
- SOC 2 and GDPR compliance features

### Can I use NovaSight on-premise?

Yes. NovaSight can be deployed:
- On-premise (self-hosted)
- Private cloud
- Hybrid configurations

---

## Getting Started

### How do I get started?

1. Log in to your NovaSight instance
2. Connect a data source
3. Define your semantic layer
4. Start asking questions!

See our [Quick Start Guide](../getting-started/quick-start.md) for step-by-step instructions.

### Do I need to know SQL?

No! NovaSight's natural language interface lets you ask questions in plain English. However, SQL knowledge is helpful for:
- Advanced queries
- Troubleshooting
- Custom calculations

### What browsers are supported?

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

## Data Sources

### What credentials should I use?

We recommend using read-only credentials:
- Prevents accidental data modification
- Limits potential security exposure
- Sufficient for all NovaSight features

### How often is schema refreshed?

By default, schema is refreshed:
- Automatically when connection settings change
- On-demand when you click "Refresh Schema"
- Optionally on a schedule (configurable)

### Can I connect to multiple databases?

Yes! You can connect as many data sources as needed. Each data source:
- Has separate credentials
- Can have its own sync schedule
- Can be used in different semantic models

---

## Natural Language Queries

### How does the AI understand my questions?

NovaSight uses a local LLM (powered by Ollama) to:
1. Parse your natural language question
2. Map entities to your semantic layer
3. Generate optimized SQL
4. Execute and visualize results

### Why didn't it understand my question?

Common reasons:
- Terms don't match semantic layer definitions
- Question is too complex
- Missing time context

Try:
- Using exact semantic layer terms
- Simplifying the question
- Adding time filters

### Is my data sent to external AI services?

No. NovaSight uses Ollama for local AI inference. Your data never leaves your infrastructure.

---

## Dashboards

### How many widgets can I add?

There's no hard limit, but for best performance:
- Optimal: 5-10 widgets
- Maximum recommended: 15 widgets
- Consider splitting large dashboards

### Can I embed dashboards in other applications?

Yes! NovaSight provides:
- Embed codes (iframe)
- Shareable links
- API access for custom integrations

### How do I share a dashboard?

1. Open your dashboard
2. Click **Share**
3. Choose:
   - Specific users
   - Roles/groups
   - Public link

---

## Semantic Layer

### What is the semantic layer?

The semantic layer translates technical database terms into business-friendly language. It defines:
- **Dimensions**: Attributes to group by
- **Measures**: Values to calculate
- **Relationships**: How tables connect

### Do I need to define everything?

No. Start with commonly used metrics and dimensions. You can always add more as needs evolve.

### Can different users see different data?

Yes, using Row-Level Security (RLS):
- Define rules based on user attributes
- Data is automatically filtered
- Users only see permitted data

---

## Performance

### Why is my query slow?

Common causes:
- Large date ranges
- Missing database indexes
- Complex joins
- High cardinality grouping

Solutions:
- Add time filters
- Request DBA add indexes
- Enable query caching
- Use pre-aggregated data

### How does caching work?

NovaSight caches query results:
- Default TTL: 15 minutes
- Configurable per dashboard
- Shared across users with same filters

### Why is my dashboard slow?

Check:
- Number of widgets (keep under 15)
- Individual widget query times
- Default filter settings
- Cache configuration

---

## Administration

### How do I add users?

1. Go to **Admin** > **Users**
2. Click **Add User**
3. Enter email and role
4. User receives invitation email

### What roles are available?

| Role | Access |
|------|--------|
| Admin | Full access |
| Analyst | Create/edit dashboards |
| Viewer | View shared dashboards |

Custom roles can also be created.

### How do I reset a user's password?

1. Go to **Admin** > **Users**
2. Find the user
3. Click **More** > **Reset Password**
4. User receives reset email

---

## Security

### How is authentication handled?

NovaSight supports:
- Username/password
- SSO (SAML, OIDC)
- Multi-factor authentication

### How long are audit logs retained?

Default retention:
- Standard logs: 90 days
- Security events: 365 days
- Configurable per tenant

### Can I export audit logs?

Yes. Go to **Admin** > **Audit Logs** > **Export**.

Formats: JSON, CSV

---

## API

### Is there an API?

Yes! NovaSight provides a REST API for:
- Managing dashboards
- Executing queries
- User management
- Audit log access

See the [API Reference](../reference/api/index.md).

### How do I get an API key?

1. Go to **Settings** > **API Keys**
2. Click **Create API Key**
3. Set scopes and expiration
4. Copy key (shown only once)

### What are rate limits?

| Tier | Limit |
|------|-------|
| Standard | 100 requests/minute |
| Premium | 500 requests/minute |
| Enterprise | Custom |

---

## Troubleshooting

### I can't log in

Try:
1. Reset your password
2. Check account status with admin
3. Clear browser cookies
4. Try incognito mode

### Data doesn't look right

Check:
1. Applied filters
2. Semantic layer definitions
3. Row-level security settings
4. Generated SQL query

### Feature is missing

Possible reasons:
- Your role doesn't have permission
- Feature is disabled for your tenant
- Feature requires upgrade

Contact your administrator.

---

## Getting Help

### How do I report a bug?

1. Collect details:
   - Error message
   - Steps to reproduce
   - Browser version
   - Screenshots
2. Contact your administrator or support

### Where can I learn more?

- [Documentation](../index.md) - You're here!
- [Quick Start](../getting-started/quick-start.md)
- [Tutorials](../getting-started/first-dashboard.md)

### Is there a community forum?

Contact your organization's NovaSight administrator for community resources and support channels.

---

## Still Have Questions?

If your question isn't answered here:

1. Check the [Common Issues](common-issues.md) guide
2. Search the documentation
3. Contact your NovaSight administrator
