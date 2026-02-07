# NovaSight Backend — Modular Monolith Refactoring Plan

> **Author:** Principal Software Architect  
> **Date:** 2026-02-07  
> **Scope:** Complete backend architectural review and refactoring roadmap  
> **Status:** APPROVED FOR EXECUTION

---

## A. Executive Summary

### System-Level Diagnosis

The NovaSight backend is a Flask-based REST API with PostgreSQL (metadata), ClickHouse (analytics), Airflow (orchestration), PySpark (compute), dbt (transformation), and Ollama (AI). It currently follows a **flat layer-cake architecture** (`api/ → services/ → models/`) with no domain boundaries, leaking cross-cutting concerns, and inconsistent enforcement of authentication, authorization, and multi-tenancy.

### Critical Architectural Issues

| # | Issue | Severity | Risk |
|---|-------|----------|------|
| 1 | **THREE incompatible encryption systems** (`encryption.py`, `credential_service.py`, `encryption_service.py`) | 🔴 CRITICAL | Data corruption — ciphertext encrypted by one cannot be decrypted by another |
| 2 | **No authorization on Semantic Layer CRUD** — any tenant user can create/delete models, dimensions, measures | 🔴 CRITICAL | Data integrity, unauthorized access |
| 3 | **`roles.py` routes are dead code** — not imported in `v1/__init__.py` | 🔴 CRITICAL | RBAC management endpoints non-functional |
| 4 | **Three different auth decorator systems** used inconsistently across routes | 🔴 HIGH | Unpredictable security posture |
| 5 | **Two conflicting password policies** (8 chars in `validators.py` vs 12 chars in `password_service.py`) | 🔴 HIGH | Weak password acceptance |
| 6 | **Dashboard auth bypasses centralized RBAC** — uses model-level methods | 🔴 HIGH | Unauditable authorization |
| 7 | **Two independent permission resolution systems** (`user_service` vs `rbac_service`) | 🟡 MEDIUM | Permission inconsistency |
| 8 | **In-memory caches without TTL** in multi-worker environment | 🟡 MEDIUM | Stale permissions/data |
| 9 | **Direct SQLAlchemy in controllers** (roles, admin/portal_users, admin/tenants, audit) | 🟡 MEDIUM | Untestable, bypasses business rules |
| 10 | **4 of 8 models don't use mixins** — manual tenant_id, timestamps | 🟡 MEDIUM | Inconsistent enforcement |

### Auth, Tenancy, and Metadata Risks

- **Auth Risk:** Five different decorator systems (`require_roles`, `require_permission`, `require_tenant`, `require_tenant_context`, manual inline checks) with different semantics, different role-name conventions (`admin` vs `tenant_admin` vs `platform_admin`), and different permission delimiters (dot vs colon).
- **Tenancy Risk:** Four different patterns for obtaining `tenant_id` across the codebase. `TenantContextMiddleware` sets `g.tenant` but some decorators independently extract from JWT. Schema-based isolation uses f-string interpolation (SQL injection vector).
- **Metadata Risk:** No centralized metadata access layer. Models are imported directly in controllers. No read/write separation. No caching strategy (except broken in-memory dicts).

### Refactoring Strategy

1. **Centralize first** — Unify auth, tenant, and encryption into a Platform kernel
2. **Isolate domains** — Introduce bounded contexts with explicit interfaces
3. **Eliminate duplication** — Merge encryption, password validation, permission resolution
4. **Enforce boundaries** — Lint rules preventing cross-domain imports
5. **Secure by default** — Every request authenticated + tenant-resolved automatically

---

## B. Domain & Platform Decomposition

### Business Domains (Bounded Contexts)

| Domain | Responsibility | Current Files |
|--------|---------------|---------------|
| **Identity & Access** | Auth, users, roles, RBAC, permissions | `auth_service`, `user_service`, `rbac_service`, `password_service`, `token_service`, User/Role/Permission models |
| **Tenant Management** | Tenant lifecycle, provisioning, quotas, config | `tenant_service`, Tenant model, `tenant_utils`, `infrastructure_config_service` |
| **Data Sources** | Connections, schema discovery, connectors | `connection_service`, `credential_manager`, DataConnection model, `connectors/*` |
| **Orchestration** | DAGs, tasks, Airflow integration, pipelines | `dag_service`, `dag_generator`, `dag_validator`, `transformation_dag_generator`, `pipeline_generator`, DagConfig model |
| **Compute** | PySpark job management, code generation | `pyspark_app_service`, PySparkApp model |
| **Transformation** | dbt models, semantic layer, dbt execution | `dbt_service`, `dbt_model_generator`, `semantic_service`, Semantic models |
| **Analytics** | Dashboards, widgets, queries, visualization | `dashboard_service`, `query_builder`, Dashboard/Widget models |
| **AI Assistant** | NL2SQL, Ollama integration, intent classification | `nl_to_sql`, `ollama/*` |

### Platform Modules (Shared Kernel)

| Module | Responsibility | Current Files |
|--------|---------------|---------------|
| **Platform.Auth** | JWT handling, token validation, identity resolution | `jwt_handlers`, `token_service` |
| **Platform.Tenant** | Tenant context, schema isolation, tenant resolution | `tenant_context.py`, `tenant_utils.py` |
| **Platform.Security** | Encryption, credential management, password hashing | `encryption_service`, `credential_service`, `credential_manager`, `password_service`, `encryption.py` |
| **Platform.Audit** | Audit logging, hash chains, security events | `audit_service`, `audit.py` (middleware) |
| **Platform.Observability** | Logging, metrics, request tracing | `logger`, `metrics`, `request_logging` |
| **Platform.Errors** | Exception hierarchy, error handling | `errors.py`, `error_handlers.py` |
| **Platform.Validation** | Input validation, pagination, naming | `validators.py`, `pagination.py`, `naming.py` |

### Ownership Boundaries

```
Platform (Shared Kernel) — owned by Platform team
├── Auth         → Token lifecycle, JWT callbacks, identity
├── Tenant       → Context resolution, schema isolation
├── Security     → Single encryption service, password policy
├── Audit        → Immutable logging
├── Observability → Structured logging, Prometheus metrics
├── Errors       → Exception hierarchy
└── Validation   → Shared validators, pagination

Identity & Access Domain — owned by Identity team
├── Users        → CRUD, profile, password management
├── Roles        → Role CRUD, hierarchy, defaults
└── Permissions  → RBAC engine, resource permissions

Data Sources Domain — owned by Data Platform team
├── Connections  → CRUD, testing, credential storage
├── Connectors   → Database drivers, schema introspection
└── Discovery    → Schema/table/column metadata extraction

Orchestration Domain — owned by Data Engineering team
├── DAGs         → Configuration CRUD, validation
├── Tasks        → Task configuration
├── Deployment   → Airflow submission, DAG generation
└── Pipelines    → End-to-end pipeline orchestration

Analytics Domain — owned by BI team
├── Dashboards   → Dashboard CRUD, sharing, layout
├── Widgets      → Widget CRUD, data execution
└── Queries      → SQL building, ClickHouse execution

Transformation Domain — owned by Data Engineering team
├── dbt          → Model generation, command execution
└── Semantic     → Semantic models, dimensions, measures

Compute Domain — owned by Data Platform team
└── PySpark      → Job config, code generation

AI Domain — owned by AI team
├── NL2SQL       → Natural language to structured query
└── LLM          → Ollama client, prompt management
```

---

## C. Proposed Folder Structure

### Current (Flat) → Proposed (Modular)

```
backend/
├── app/
│   ├── __init__.py              # App factory (KEEP, refactor)
│   ├── config.py                # Config (KEEP)
│   ├── extensions.py            # Extensions (KEEP)
│   │
│   ├── platform/                # ═══ SHARED KERNEL ═══
│   │   ├── __init__.py
│   │   ├── auth/                # Centralized authentication
│   │   │   ├── __init__.py
│   │   │   ├── jwt_handler.py   # ← from middleware/jwt_handlers.py
│   │   │   ├── token_service.py # ← from services/token_service.py
│   │   │   ├── decorators.py    # ← ALL auth decorators unified here
│   │   │   └── identity.py      # User identity resolution
│   │   │
│   │   ├── tenant/              # Centralized tenancy
│   │   │   ├── __init__.py
│   │   │   ├── context.py       # ← from middleware/tenant_context.py
│   │   │   ├── schema.py        # ← from utils/tenant_utils.py
│   │   │   └── decorators.py    # Tenant enforcement decorators
│   │   │
│   │   ├── security/            # Single encryption system
│   │   │   ├── __init__.py
│   │   │   ├── encryption.py    # ← MERGE encryption_service + credential_service + encryption.py
│   │   │   ├── passwords.py     # ← from services/password_service.py
│   │   │   └── credentials.py   # ← from services/credential_manager.py (uses unified encryption)
│   │   │
│   │   ├── audit/               # Centralized audit
│   │   │   ├── __init__.py
│   │   │   ├── service.py       # ← from services/audit_service.py
│   │   │   └── decorators.py    # ← from middleware/audit.py
│   │   │
│   │   ├── observability/       # Logging, metrics, tracing
│   │   │   ├── __init__.py
│   │   │   ├── logging.py       # ← from utils/logger.py
│   │   │   ├── metrics.py       # ← from middleware/metrics.py
│   │   │   └── request_logging.py
│   │   │
│   │   ├── errors/              # Error handling
│   │   │   ├── __init__.py
│   │   │   ├── exceptions.py    # ← from errors.py
│   │   │   └── handlers.py      # ← from middleware/error_handlers.py (MERGE with errors.py handlers)
│   │   │
│   │   └── validation/          # Shared validators
│   │       ├── __init__.py
│   │       ├── validators.py    # ← from utils/validators.py
│   │       ├── pagination.py    # ← from utils/pagination.py
│   │       └── naming.py        # ← from utils/naming.py
│   │
│   ├── domains/                 # ═══ BUSINESS DOMAINS ═══
│   │   │
│   │   ├── identity/            # Identity & Access domain
│   │   │   ├── __init__.py
│   │   │   ├── api/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth_routes.py    # ← from api/v1/auth.py
│   │   │   │   ├── user_routes.py    # ← from api/v1/users.py
│   │   │   │   └── role_routes.py    # ← from api/v1/roles.py
│   │   │   ├── application/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth_service.py   # ← from services/auth_service.py
│   │   │   │   ├── user_service.py   # ← from services/user_service.py
│   │   │   │   └── rbac_service.py   # ← from services/rbac_service.py
│   │   │   ├── domain/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py         # User, Role, UserRole, Permission, etc.
│   │   │   │   └── rules.py          # Business rules (role hierarchy, permission logic)
│   │   │   ├── infrastructure/
│   │   │   │   └── __init__.py
│   │   │   └── schemas/
│   │   │       ├── auth_schemas.py
│   │   │       ├── user_schemas.py
│   │   │       └── role_schemas.py
│   │   │
│   │   ├── tenants/             # Tenant Management domain
│   │   │   ├── __init__.py
│   │   │   ├── api/
│   │   │   │   ├── __init__.py
│   │   │   │   └── tenant_routes.py  # ← MERGE api/v1/tenants.py + admin/tenants.py
│   │   │   ├── application/
│   │   │   │   ├── __init__.py
│   │   │   │   └── tenant_service.py
│   │   │   ├── domain/
│   │   │   │   ├── __init__.py
│   │   │   │   └── models.py         # Tenant, TenantStatus
│   │   │   ├── infrastructure/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── provisioning.py   # Schema/DB creation (extracted from tenant_service)
│   │   │   │   └── config_service.py # ← from infrastructure_config_service.py
│   │   │   └── schemas/
│   │   │       └── tenant_schemas.py
│   │   │
│   │   ├── datasources/         # Data Sources domain
│   │   │   ├── __init__.py
│   │   │   ├── api/
│   │   │   │   ├── __init__.py
│   │   │   │   └── connection_routes.py
│   │   │   ├── application/
│   │   │   │   ├── __init__.py
│   │   │   │   └── connection_service.py
│   │   │   ├── domain/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py         # DataConnection, DataSourceSchema/Table/Column
│   │   │   │   └── value_objects.py   # MERGE connector DTOs with model DTOs
│   │   │   ├── infrastructure/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── connectors/       # ← from connectors/
│   │   │   │   │   ├── base.py
│   │   │   │   │   ├── registry.py
│   │   │   │   │   ├── postgresql.py
│   │   │   │   │   ├── mysql.py
│   │   │   │   │   └── utils/
│   │   │   │   └── discovery.py      # Schema introspection orchestration
│   │   │   └── schemas/
│   │   │       └── connection_schemas.py
│   │   │
│   │   ├── orchestration/       # Orchestration domain
│   │   │   ├── __init__.py
│   │   │   ├── api/
│   │   │   │   ├── __init__.py
│   │   │   │   └── dag_routes.py
│   │   │   ├── application/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── dag_service.py
│   │   │   │   └── pipeline_service.py  # ← from pipeline_generator.py
│   │   │   ├── domain/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py         # DagConfig, DagVersion, TaskConfig
│   │   │   │   └── validators.py     # ← from dag_validator.py
│   │   │   ├── infrastructure/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── airflow_client.py
│   │   │   │   ├── dag_generator.py   # File I/O for DAG generation
│   │   │   │   └── transformation_dag_generator.py
│   │   │   └── schemas/
│   │   │       └── dag_schemas.py
│   │   │
│   │   ├── analytics/           # Analytics domain
│   │   │   ├── __init__.py
│   │   │   ├── api/
│   │   │   │   ├── __init__.py
│   │   │   │   └── dashboard_routes.py
│   │   │   ├── application/
│   │   │   │   ├── __init__.py
│   │   │   │   └── dashboard_service.py
│   │   │   ├── domain/
│   │   │   │   ├── __init__.py
│   │   │   │   └── models.py         # Dashboard, Widget
│   │   │   ├── infrastructure/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── query_builder.py
│   │   │   │   └── clickhouse_client.py
│   │   │   └── schemas/
│   │   │       └── dashboard_schemas.py
│   │   │
│   │   ├── transformation/      # Transformation domain
│   │   │   ├── __init__.py
│   │   │   ├── api/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── dbt_routes.py
│   │   │   │   └── semantic_routes.py
│   │   │   ├── application/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── dbt_service.py
│   │   │   │   └── semantic_service.py
│   │   │   ├── domain/
│   │   │   │   ├── __init__.py
│   │   │   │   └── models.py         # SemanticModel, Dimension, Measure, Relationship
│   │   │   ├── infrastructure/
│   │   │   │   ├── __init__.py
│   │   │   │   └── dbt_model_generator.py
│   │   │   └── schemas/
│   │   │       ├── dbt_schemas.py
│   │   │       └── semantic_schemas.py
│   │   │
│   │   ├── compute/             # Compute domain
│   │   │   ├── __init__.py
│   │   │   ├── api/
│   │   │   │   ├── __init__.py
│   │   │   │   └── pyspark_routes.py
│   │   │   ├── application/
│   │   │   │   ├── __init__.py
│   │   │   │   └── pyspark_service.py
│   │   │   ├── domain/
│   │   │   │   ├── __init__.py
│   │   │   │   └── models.py         # PySparkApp
│   │   │   └── schemas/
│   │   │       └── pyspark_schemas.py
│   │   │
│   │   └── ai/                  # AI Assistant domain
│   │       ├── __init__.py
│   │       ├── api/
│   │       │   ├── __init__.py
│   │       │   └── assistant_routes.py
│   │       ├── application/
│   │       │   ├── __init__.py
│   │       │   └── nl_to_sql_service.py
│   │       ├── domain/
│   │       │   └── __init__.py
│   │       └── infrastructure/
│   │           ├── __init__.py
│   │           └── ollama/       # ← from services/ollama/
│   │
│   ├── api/                     # ═══ THIN API SHELL ═══
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   └── __init__.py      # Blueprint registration only — imports from domains
│   │   ├── health.py
│   │   ├── swagger.py
│   │   └── admin/
│   │       └── __init__.py      # Admin blueprint — imports from domains
│   │
│   └── templates/               # Code generation templates (KEEP)
│       └── airflow/
│
├── templates/                   # Top-level Jinja2 templates (KEEP)
├── migrations/                  # Alembic (KEEP)
└── tests/                       # Tests (restructure to mirror domains)
```

---

## D. Refactoring Plan — Step-by-Step

### Phase 0: Critical Security Fixes (IMMEDIATE — Before Any Refactoring)

> These are security issues that should be fixed regardless of the refactoring.

| Step | Task | Risk | Files |
|------|------|------|-------|
| 0.1 | **Import `roles.py` in `v1/__init__.py`** to activate role endpoints | Dead feature | `api/v1/__init__.py` |
| 0.2 | **Add `require_permission` to semantic CRUD endpoints** | Unauthorized access | `api/v1/semantic.py` |
| 0.3 | **Add auth to `GET /assistant/health`** | Info disclosure | `api/v1/assistant.py` |
| 0.4 | **Add `require_roles` to `POST /connections`** | Unauthorized creation | `api/v1/connections.py` |
| 0.5 | **Delete `check_user.py`** (hardcoded password) | Credential leak | `check_user.py` |
| 0.6 | **Fix duplicate `get_current_user_id`** in `tenant_context.py` | Shadowed function | `middleware/tenant_context.py` |
| 0.7 | **Unify password policy to 12-char minimum** | Weak passwords | `utils/validators.py` |
| 0.8 | **Fix Oracle type map case mismatch** | Silent bug | `connectors/utils/type_mapping.py` |

### Phase 1: Platform Kernel (Week 1-2)

> Extract cross-cutting concerns into `app/platform/`. No domain changes yet.

| Step | Task | Priority | Complexity |
|------|------|----------|------------|
| 1.1 | Create `platform/` directory structure | Setup | Low |
| 1.2 | **Unify auth decorators** into `platform/auth/decorators.py` — merge `require_roles`, `require_permission`, `require_any_permission`, `require_tenant_context`, `require_tenant` into a single coherent system | 🔴 HIGH | HIGH |
| 1.3 | Move `jwt_handlers.py` → `platform/auth/jwt_handler.py` | MEDIUM | LOW |
| 1.4 | Move `token_service.py` → `platform/auth/token_service.py` | MEDIUM | LOW |
| 1.5 | Create `platform/auth/identity.py` — single source for user identity resolution | HIGH | MEDIUM |
| 1.6 | Move `tenant_context.py` → `platform/tenant/context.py` | MEDIUM | LOW |
| 1.7 | Move `tenant_utils.py` → `platform/tenant/schema.py` | MEDIUM | LOW |
| 1.8 | **MERGE 3 encryption systems** into `platform/security/encryption.py` — use `encryption_service.py` as base (version-prefixed, PBKDF2), delete `credential_service.py` and `utils/encryption.py` | 🔴 CRITICAL | HIGH |
| 1.9 | Move `password_service.py` → `platform/security/passwords.py` | MEDIUM | LOW |
| 1.10 | Refactor `credential_manager.py` → `platform/security/credentials.py` to use unified encryption | HIGH | MEDIUM |
| 1.11 | Move `audit_service.py` → `platform/audit/service.py` | MEDIUM | LOW |
| 1.12 | Move audit decorators → `platform/audit/decorators.py` | MEDIUM | LOW |
| 1.13 | Move `errors.py` + `error_handlers.py` → `platform/errors/` (merge duplicate handlers) | MEDIUM | LOW |
| 1.14 | Move `logger.py`, `metrics.py`, `request_logging.py` → `platform/observability/` | LOW | LOW |
| 1.15 | Move `validators.py`, `pagination.py`, `naming.py` → `platform/validation/` | LOW | LOW |
| 1.16 | Update all imports across codebase to use `platform.*` paths | REQUIRED | MEDIUM |
| 1.17 | **Standardize permission delimiter** to dot-notation everywhere | HIGH | MEDIUM |
| 1.18 | **Standardize role names** — define canonical role names in `platform/auth/constants.py` | HIGH | LOW |

### Phase 2: Identity & Access Domain (Week 2-3)

> First domain extraction. Auth is the foundation for all other domains.

| Step | Task | Priority | Complexity |
|------|------|----------|------------|
| 2.1 | Create `domains/identity/` directory structure | Setup | LOW |
| 2.2 | Move User, Role, UserRole, Permission, ResourcePermission models → `domains/identity/domain/models.py` | HIGH | MEDIUM |
| 2.3 | Extract business rules from `rbac_service.py` → `domains/identity/domain/rules.py` | HIGH | MEDIUM |
| 2.4 | Move `auth_service.py` → `domains/identity/application/auth_service.py` — remove direct Tenant queries, use tenant interface | HIGH | MEDIUM |
| 2.5 | Move `user_service.py` → `domains/identity/application/user_service.py` — remove duplicated password validation, use `platform/security/passwords.py` | HIGH | MEDIUM |
| 2.6 | Move `rbac_service.py` → `domains/identity/application/rbac_service.py` — merge with permission resolution from `user_service` | HIGH | HIGH |
| 2.7 | Move auth/user/role routes → `domains/identity/api/` | MEDIUM | MEDIUM |
| 2.8 | **Rewrite `roles.py` routes** — extract all direct model access into `rbac_service` | 🔴 HIGH | MEDIUM |
| 2.9 | Move schemas → `domains/identity/schemas/` | LOW | LOW |
| 2.10 | Replace in-memory permission cache with Redis-backed cache (from `platform/`) | HIGH | MEDIUM |

### Phase 3: Tenant Management Domain (Week 3-4)

| Step | Task | Priority | Complexity |
|------|------|----------|------------|
| 3.1 | Create `domains/tenants/` directory structure | Setup | LOW |
| 3.2 | Move Tenant, InfrastructureConfig models → `domains/tenants/domain/` | MEDIUM | LOW |
| 3.3 | **Extract provisioning logic** (PG schema + CH database creation) from `tenant_service` → `domains/tenants/infrastructure/provisioning.py` | HIGH | MEDIUM |
| 3.4 | Move `infrastructure_config_service.py` → `domains/tenants/infrastructure/config_service.py` | MEDIUM | LOW |
| 3.5 | **Merge admin/tenants.py and v1/tenants.py** — create a single tenant API with admin-only endpoints distinguished by permissions | HIGH | MEDIUM |
| 3.6 | Remove duplicated `suspend_tenant` / `deactivate_tenant` | LOW | LOW |
| 3.7 | Move schemas → `domains/tenants/schemas/` | LOW | LOW |
| 3.8 | Extract direct SQLAlchemy from `admin/tenants.py` into `tenant_service` | HIGH | MEDIUM |

### Phase 4: Data Sources Domain (Week 4-5)

| Step | Task | Priority | Complexity |
|------|------|----------|------------|
| 4.1 | Create `domains/datasources/` directory structure | Setup | LOW |
| 4.2 | Move DataConnection model → `domains/datasources/domain/` | MEDIUM | LOW |
| 4.3 | **Merge DTOs**: `connectors/base.py` ColumnInfo/TableInfo + `models/data_source.py` DataSourceColumn/Table → unified value objects | HIGH | MEDIUM |
| 4.4 | Move `connectors/` → `domains/datasources/infrastructure/connectors/` | MEDIUM | LOW |
| 4.5 | Make DataConnection model **use TenantMixin** instead of manual columns | MEDIUM | LOW |
| 4.6 | Refactor `connection_service` to use unified encryption from `platform/security/` | HIGH | MEDIUM |
| 4.7 | Remove dual response format from `connection_service.list_connections()` | LOW | LOW |
| 4.8 | Move schemas | LOW | LOW |

### Phase 5: Orchestration Domain (Week 5-6)

| Step | Task | Priority | Complexity |
|------|------|----------|------------|
| 5.1 | Create `domains/orchestration/` directory structure | Setup | LOW |
| 5.2 | Move DagConfig, DagVersion, TaskConfig → `domains/orchestration/domain/` — adopt TenantMixin, TimestampMixin | MEDIUM | MEDIUM |
| 5.3 | Move `dag_service`, `pipeline_generator` → `domains/orchestration/application/` | MEDIUM | LOW |
| 5.4 | Move `dag_validator` → `domains/orchestration/domain/validators.py` | MEDIUM | LOW |
| 5.5 | Move `dag_generator`, `transformation_dag_generator`, `airflow_client` → `domains/orchestration/infrastructure/` | MEDIUM | LOW |
| 5.6 | Move schemas and routes | LOW | LOW |

### Phase 6: Remaining Domains (Week 6-8)

| Step | Task | Priority | Complexity |
|------|------|----------|------------|
| 6.1 | **Analytics domain**: Move Dashboard/Widget models, dashboard_service, query_builder, clickhouse_client | MEDIUM | MEDIUM |
| 6.2 | **Transformation domain**: Move Semantic models, semantic_service, dbt_service, dbt_model_generator | MEDIUM | MEDIUM |
| 6.3 | **Compute domain**: Move PySparkApp model, pyspark_app_service (adopt mixins) | MEDIUM | LOW |
| 6.4 | **AI domain**: Move nl_to_sql, ollama/ | MEDIUM | LOW |
| 6.5 | **Remove model-level authz from Dashboard** — move `can_view`/`can_edit` to analytics domain service | HIGH | MEDIUM |
| 6.6 | Add `require_permission` to all semantic CRUD endpoints | 🔴 HIGH | LOW |

### Phase 7: Dead Code Elimination & Final Cleanup (Week 8-9)

| Step | Task | Priority | Complexity |
|------|------|----------|------------|
| 7.1 | Delete `app/decorators.py` (replaced by `platform/auth/decorators.py`) | HIGH | LOW |
| 7.2 | Delete `app/utils/encryption.py` (replaced by `platform/security/encryption.py`) | 🔴 HIGH | LOW |
| 7.3 | Delete `app/services/credential_service.py` (merged into unified encryption) | 🔴 HIGH | LOW |
| 7.4 | Delete `app/middleware/` directory (all moved to `platform/`) | HIGH | LOW |
| 7.5 | Delete `app/utils/` directory (all moved to `platform/validation/`) | HIGH | LOW |
| 7.6 | Delete `app/services/` flat directory (all moved to domain `application/` layers) | HIGH | LOW |
| 7.7 | Delete `app/models/` flat directory (all moved to domain `domain/` layers) | HIGH | LOW |
| 7.8 | Delete `app/schemas/` flat directory (all moved to domain `schemas/`) | MEDIUM | LOW |
| 7.9 | Delete `check_user.py` | 🔴 HIGH | LOW |
| 7.10 | Delete empty `db` CLI command group from `commands.py` | LOW | LOW |
| 7.11 | Remove dead `SoftDeleteMixin` event listener (never wired) | LOW | LOW |
| 7.12 | Remove dead `ColumnDataType` enum from `data_source.py` | LOW | LOW |
| 7.13 | Remove dead `ModelType` enum from `semantic.py` | LOW | LOW |
| 7.14 | Remove dead `InfrastructureType` enum usage inconsistency | LOW | LOW |
| 7.15 | Clean up `api/v1/admin/portal_users.py` — extract all direct SQLAlchemy into service | MEDIUM | MEDIUM |
| 7.16 | Remove `backup.py` API and `backup_service.py` if not in MVP scope | LOW | LOW |

### Phase 8: Cross-Domain Interfaces & Integration (Week 9-10)

| Step | Task | Priority | Complexity |
|------|------|----------|------------|
| 8.1 | Define explicit interfaces (ABCs) for cross-domain communication | HIGH | MEDIUM |
| 8.2 | Identity → Tenant: `TenantResolver` interface | HIGH | LOW |
| 8.3 | DataSources → Identity: `AccessChecker` interface | HIGH | LOW |
| 8.4 | Analytics → DataSources: `ConnectionProvider` interface | HIGH | LOW |
| 8.5 | Orchestration → DataSources: `SchemaProvider` interface | MEDIUM | LOW |
| 8.6 | Transformation → DataSources: `SourceMetadataProvider` interface | MEDIUM | LOW |
| 8.7 | AI → Transformation: `SemanticLayerProvider` interface | MEDIUM | LOW |
| 8.8 | Implement import linting rules to prevent cross-domain internal imports | HIGH | MEDIUM |

### Phase 9: Test Restructuring (Week 10-11)

| Step | Task | Priority | Complexity |
|------|------|----------|------------|
| 9.1 | Mirror domain structure in `tests/` | MEDIUM | MEDIUM |
| 9.2 | Add integration tests for cross-domain interfaces | HIGH | HIGH |
| 9.3 | Add auth/tenant enforcement tests for every endpoint | 🔴 HIGH | MEDIUM |
| 9.4 | Add encryption migration test (ensure old ciphertext can be decrypted) | 🔴 HIGH | MEDIUM |

---

## E. Code Actions

### Files to DELETE

| File | Reason |
|------|--------|
| `check_user.py` | Hardcoded credentials, dev-only diagnostic |
| `app/utils/encryption.py` | Third (legacy) encryption system — merge into unified |
| `app/services/credential_service.py` | Duplicate of `encryption_service.py` with incompatible format |
| `app/decorators.py` | Replaced by unified `platform/auth/decorators.py` |
| `app/middleware/error_handlers.py` | Merge with `errors.py` handlers (duplicate 500 handler) |

### Files to MERGE

| Source Files | Target | Reason |
|-------------|--------|--------|
| `encryption_service.py` + `credential_service.py` + `utils/encryption.py` | `platform/security/encryption.py` | Three incompatible encryption systems |
| `errors.py` + `middleware/error_handlers.py` | `platform/errors/` | Duplicate error handling |
| `api/v1/tenants.py` + `api/v1/admin/tenants.py` | `domains/tenants/api/tenant_routes.py` | Overlapping tenant management |
| `require_roles` + `require_permission` + `require_tenant_context` + `require_tenant` | `platform/auth/decorators.py` | Five auth decorator systems |
| `connectors/base.py` DTOs + `models/data_source.py` DTOs | `domains/datasources/domain/value_objects.py` | Duplicate schema metadata types |

### New Shared Modules to Introduce

| Module | Purpose |
|--------|---------|
| `platform/auth/constants.py` | Canonical role names, permission names, delimiters |
| `platform/auth/identity.py` | Unified `get_current_identity()` → returns typed `Identity` dataclass |
| `platform/tenant/decorators.py` | Single `@tenant_required` that works consistently |
| `platform/security/encryption.py` | Unified AES-256 + PBKDF2 + version-prefix encryption |
| `platform/validation/response.py` | Standardized API response envelope |
| Domain `interfaces.py` per domain | ABCs for cross-domain communication |

### Interfaces to Define

```python
# platform/auth/interfaces.py
class IAccessChecker(ABC):
    def check_permission(self, user_id: str, permission: str) -> bool: ...
    def check_resource_access(self, user_id: str, resource_type: str, resource_id: str, level: str) -> bool: ...

# platform/tenant/interfaces.py
class ITenantResolver(ABC):
    def resolve(self, tenant_id: str) -> TenantContext: ...
    def get_schema_name(self, tenant_slug: str) -> str: ...

# Cross-domain interfaces
class IConnectionProvider(ABC):  # DataSources → Analytics
    def get_connection(self, tenant_id: str, connection_id: str) -> ConnectionInfo: ...

class ISchemaProvider(ABC):  # DataSources → Orchestration
    def get_tables(self, tenant_id: str, connection_id: str) -> list[TableInfo]: ...

class ISemanticLayerProvider(ABC):  # Transformation → AI
    def get_models(self, tenant_id: str) -> list[SemanticModelInfo]: ...
    def get_dimensions(self, model_id: str) -> list[DimensionInfo]: ...
    def get_measures(self, model_id: str) -> list[MeasureInfo]: ...
```

---

## F. Rules Enforcement

### Where Auth/Tenant Logic Leaks Today

| Location | Leak Type | Current State | Fix |
|----------|-----------|---------------|-----|
| `api/v1/semantic.py` | Missing auth | No permission checks on CRUD | Add `@require_permission('semantic.*')` |
| `api/v1/connections.py` POST | Missing role check | Any tenant user can create connections | Add `@require_roles(['data_engineer', 'tenant_admin'])` |
| `api/v1/assistant.py` GET health | Missing auth | Public endpoint exposes Ollama info | Add `@jwt_required()` |
| `api/v1/roles.py` | Dead code | Not imported in blueprint | Import in `v1/__init__.py` |
| `api/v1/auth.py` L155-166 | Direct model access | Queries User model directly in controller | Move to `auth_service` |
| `api/v1/roles.py` (entire file) | Business logic in controller | Direct SQLAlchemy CRUD | Create `RoleService` |
| `api/v1/admin/portal_users.py` | Business logic in controller | Complex queries in routes | Create `AdminUserService` |
| `api/v1/audit.py` | Different auth system | Uses `require_tenant` not `require_tenant_context` | Unify decorators |
| `dashboard_service.py` | Auth bypass | Uses `dashboard.can_view()` not RBAC | Route through `rbac_service` |
| `decorators.py` `require_roles` | Role name matching | Prefix-matching `admin` matches `admin_xyz` | Switch to exact match |

### How to Prevent Future Violations

1. **Import Linting**: Add a custom flake8/ruff rule that prevents:
   - Any file in `domains/X/` from importing from `domains/Y/` internals
   - Any file outside `platform/auth/` from importing `flask_jwt_extended` directly
   - Any file outside `platform/tenant/` from accessing `g.tenant_id` directly

2. **Architectural Decision Records (ADRs)**:
   - ADR-AUTH-001: All auth via `platform/auth/decorators.py`
   - ADR-TENANT-001: All tenant resolution via `platform/tenant/`
   - ADR-ENCRYPT-001: Single encryption service, version-prefixed ciphertext
   - ADR-INTERFACE-001: Cross-domain only via interfaces

3. **CI Checks**:
   - Import dependency graph validation on every PR
   - No new `db.session.query()` calls in API layer
   - 100% auth coverage — every non-public endpoint must have auth decorator

---

## G. Risks & Validation

### Security Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Encryption migration — data encrypted with old systems | 🔴 CRITICAL | Write migration script that re-encrypts all credentials with unified system. Test with production data backup. |
| Missing auth on semantic endpoints | 🔴 CRITICAL | Fix in Phase 0 before any refactoring |
| Dead role endpoints | 🔴 HIGH | Fix in Phase 0 |
| `check_user.py` with hardcoded credentials in repo | 🔴 HIGH | Delete immediately |
| f-string SQL in tenant schema isolation | 🟡 MEDIUM | Replace with parameterized `quote_ident()` in Phase 1 |
| Token blacklist fails open when Redis is down | 🟡 MEDIUM | Add circuit breaker, fail closed in production |

### Data Isolation Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `ClickhouseClient` tenant isolation depends on caller passing correct database | 🟡 MEDIUM | Enforce tenant database name from tenant context, not caller |
| `for_tenant()` mixin not used by 4 models | 🟡 MEDIUM | Adopt mixin in Phase 4-6 |
| Schema search_path reset on error may leak tenant data | 🟡 MEDIUM | Ensure `teardown_request` always resets to `public` |

### Performance Validation Strategy

| Area | Validation |
|------|------------|
| Encryption migration | Benchmark: encrypt/decrypt 10K credentials, measure latency delta |
| Redis permission cache (replacing in-memory) | Load test: 1000 concurrent users, measure p99 permission check latency |
| Import restructuring | Startup time: measure app factory `create_app()` before/after |
| Database queries | Verify no N+1 regressions with SQLAlchemy eager/lazy loading changes |
| Tenant schema isolation | Test with 100 concurrent tenants, verify zero cross-tenant data leakage |

---

## Appendix: Dependency Direction Rules

```
┌─────────────────────────────────────────────────┐
│                   API Layer                      │
│         (thin, stateless, no logic)              │
│     ┌──────────────────────────────────┐         │
│     │      Application Layer           │         │
│     │   (use cases, orchestration)     │         │
│     │  ┌─────────────────────────┐     │         │
│     │  │    Domain Layer         │     │         │
│     │  │ (business rules, models)│     │         │
│     │  └─────────────────────────┘     │         │
│     └──────────────────────────────────┘         │
│                                                  │
│   Infrastructure Layer (DB, external APIs)       │
│     (implements domain interfaces)               │
└─────────────────────────────────────────────────┘

Dependencies point INWARD:
  API → Application → Domain ← Infrastructure
  
Platform (Shared Kernel) can be consumed by ANY layer.
No domain may import another domain's internals.
Cross-domain: only via explicit interfaces defined in domain layer.
```

---

*End of Refactoring Plan — NovaSight Modular Monolith Architecture*
