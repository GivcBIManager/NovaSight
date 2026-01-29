# ADR-001: Metadata Store Selection

## Status

✅ **Accepted**

## Summary

**PostgreSQL 15+** is selected as the metadata store for NovaSight.

## Context

NovaSight requires a centralized metadata store to persist:

- Tenant configurations and settings
- User accounts, roles, and permissions
- Data connection configurations (encrypted credentials)
- Ingestion job configurations
- dbt model metadata
- DAG configurations
- Alert definitions
- Audit logs
- Session management

## Decision

Use PostgreSQL as the primary metadata store with:

- **Schema-per-tenant** isolation using `search_path`
- **JSONB columns** for flexible configuration storage
- **Strong ACID transactions** for security-critical operations

## Rationale

| Requirement | PostgreSQL Capability |
|-------------|----------------------|
| ACID Transactions | Full compliance with strong isolation |
| Relational Modeling | Native support for complex relationships |
| Flexible Schema | JSONB for evolving configurations |
| Multi-Tenant Isolation | Schema-per-tenant with `search_path` |
| Encryption | TDE support, pg_crypto |
| Performance | Excellent read performance with indexing |
| Ecosystem | SQLAlchemy, Flask-SQLAlchemy |

## Alternatives Considered

| Option | Why Rejected |
|--------|--------------|
| MongoDB | Weaker transactions, complex joins |
| MySQL | Limited JSON support, weaker schema isolation |
| CockroachDB | Operational complexity, cost |

## Schema Structure

```
novasight_platform/
├── public/                    # Platform-level tables
│   ├── tenants
│   ├── platform_admins
│   └── subscription_plans
│
├── tenant_<slug>/            # Per-tenant schemas
│   ├── users
│   ├── roles
│   ├── dashboards
│   ├── data_connections
│   └── audit_log
```

## Consequences

### Positive
- Strong consistency for security operations
- Mature ecosystem with Flask integration
- Schema-based multi-tenancy provides logical isolation

### Negative
- Requires careful connection pooling
- Schema-per-tenant increases DDL complexity

### Mitigations
- Use PgBouncer for connection pooling
- Automated schema migration tooling

---

*Full details: [Architecture Decisions](../../requirements/Architecture_Decisions.md#adr-001-metadata-store-selection)*
