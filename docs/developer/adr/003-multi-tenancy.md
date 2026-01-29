# ADR-003: Multi-Tenant Isolation Strategy

## Status

✅ **Accepted**

## Summary

Implement **Schema-per-Tenant** isolation for PostgreSQL metadata and **Database-per-Tenant** isolation for ClickHouse analytical data.

## Context

NovaSight must support multiple tenants with complete data and configuration isolation. Tenants must not be able to access each other's data under any circumstances.

## Decision

Use a hybrid multi-tenancy approach:

| Component | Isolation Strategy |
|-----------|-------------------|
| PostgreSQL | Schema-per-tenant |
| ClickHouse | Database-per-tenant |
| Redis | Key prefix per tenant |
| Airflow | Folder-per-tenant |
| dbt | Project-per-tenant |
| File Storage | Folder-per-tenant |

## Architecture

```
Request: https://acme.novasight.com/api/...
                    │
                    ▼
        ┌─────────────────────────┐
        │  Tenant Resolution      │
        │  Middleware             │
        │  • Extract from subdomain│
        │  • Validate tenant      │
        │  • Inject context       │
        └─────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────────┐  ┌───────────────────┐
│ PostgreSQL        │  │ ClickHouse        │
│                   │  │                   │
│ SET search_path   │  │ USE tenant_acme;  │
│ TO tenant_acme;   │  │                   │
└───────────────────┘  └───────────────────┘
```

## Implementation Details

### PostgreSQL Schema Isolation

```python
# Middleware sets schema per request
def set_tenant_schema(tenant_slug: str):
    db.session.execute(
        text(f"SET search_path TO tenant_{tenant_slug}, public")
    )
```

### ClickHouse Database Isolation

```python
# All queries scoped to tenant database
def execute_query(tenant_id: str, sql: str):
    return clickhouse.query(
        database=f"tenant_{tenant_id}",
        query=sql
    )
```

### Redis Key Prefixing

```python
# All keys prefixed with tenant ID
def cache_key(tenant_id: str, key: str) -> str:
    return f"tenant:{tenant_id}:{key}"
```

## Isolation Enforcement

| Layer | Enforcement Mechanism |
|-------|----------------------|
| API | Tenant context injection middleware |
| Database | Schema/database scoping |
| Cache | Key prefix validation |
| Storage | Path construction with tenant ID |

## Consequences

### Positive
- Strong isolation with minimal performance overhead
- Tenant-specific backup and restore possible
- Resource usage attributable per tenant
- Compliance-friendly for data residency

### Negative
- Schema migrations must propagate to all tenants
- Connection pooling more complex
- Platform-wide queries require cross-schema access

### Mitigations
- Automated migration tooling
- Connection pool per tenant with limits
- Super admin role with cross-tenant access

---

*Full details: [Architecture Decisions](../../requirements/Architecture_Decisions.md#adr-003-multi-tenant-isolation-strategy)*
