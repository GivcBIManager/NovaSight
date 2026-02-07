# NovaSight Modular Monolith — Execution Checklist

> Granular, ordered, safe-to-execute steps.  
> Each step is independently testable and deployable.  
> Execute top-to-bottom. Do not skip.

---

## PHASE 0 — Critical Security Fixes (Do FIRST, before any restructuring)

### 0.1 Fix Dead Role Endpoints
- [x] Open `backend/app/api/v1/__init__.py`
- [x] Add `from app.api.v1 import roles` to the import list
- [ ] Verify roles routes appear in `/api/v1/docs` Swagger UI
- [ ] **Test:** `GET /api/v1/roles` returns role list (not 404)

### 0.2 Add Auth to Semantic CRUD
- [x] Open `backend/app/api/v1/semantic.py`
- [x] Add `@jwt_required()` and `@require_permission('semantic.create')` to POST endpoints
- [x] Add `@require_permission('semantic.update')` to PUT endpoints  
- [x] Add `@require_permission('semantic.delete')` to DELETE endpoints
- [x] Add `@require_permission('semantic.view')` to GET endpoints
- [ ] **Test:** Unauthenticated request to `POST /api/v1/semantic/models` returns 401
- [ ] **Test:** User without `semantic.create` permission gets 403

### 0.3 Add Auth to Assistant Health
- [x] Open `backend/app/api/v1/assistant.py`
- [x] Add `@jwt_required()` to `GET /assistant/health`
- [ ] **Test:** Unauthenticated request returns 401

### 0.4 Add Role Check to Connection Creation
- [x] Open `backend/app/api/v1/connections.py`
- [x] Add `@require_roles(['data_engineer', 'tenant_admin'])` to `POST /connections`
- [x] Add `@require_roles(['data_engineer', 'tenant_admin'])` to inline test endpoint
- [ ] **Test:** User with `viewer` role cannot create connections

### 0.5 Delete check_user.py
- [x] Delete `backend/check_user.py`
- [x] Grep codebase for any references to `check_user` — remove if found
- [x] **Verify:** No import errors

### 0.6 Fix Duplicate Function in tenant_context.py
- [x] Open `backend/app/middleware/tenant_context.py`
- [x] Find the duplicate `get_current_user_id()` definition (lines ~219 and ~233)
- [x] Remove the second (shadowed) definition
- [ ] **Test:** `get_current_user_id()` still works correctly

### 0.7 Unify Password Policy
- [x] Open `backend/app/utils/validators.py`
- [x] Change `validate_password()` minimum length from 8 to 12
- [x] Add special character requirement to match `password_service.py`
- [ ] **Test:** Password `'Abcdefgh1!'` (10 chars) is rejected
- [ ] **Test:** Password `'Abcdefghijk1!'` (13 chars) is accepted

### 0.8 Fix Oracle Type Map Case Bug
- [x] Open `backend/app/connectors/utils/type_mapping.py`
- [x] Change Oracle type map keys to lowercase (or change lookup to case-insensitive)
- [ ] **Test:** `map_type('oracle', 'VARCHAR2')` returns correct type

---

## PHASE 1 — Platform Kernel Extraction

### Step 1.1: Create Platform Directory Structure
- [x] Create `backend/app/platform/__init__.py`
- [x] Create `backend/app/platform/auth/__init__.py`
- [x] Create `backend/app/platform/tenant/__init__.py`
- [x] Create `backend/app/platform/security/__init__.py`
- [x] Create `backend/app/platform/audit/__init__.py`
- [x] Create `backend/app/platform/observability/__init__.py`
- [x] Create `backend/app/platform/errors/__init__.py`
- [x] Create `backend/app/platform/validation/__init__.py`
- [ ] **Verify:** All `__init__.py` files exist, app starts without errors

### Step 1.2: Define Auth Constants
- [x] Create `backend/app/platform/auth/constants.py`
- [x] Define canonical `ROLE_NAMES` dict: `super_admin`, `tenant_admin`, `data_engineer`, `bi_developer`, `analyst`, `viewer`, `auditor`
- [x] Define `PERMISSION_DELIMITER = '.'` (standardize from mixed `.`/`:`)
- [x] Define `PUBLIC_ENDPOINTS` frozenset (move from `tenant_context.py`)
- [ ] **Test:** Import succeeds from any module

### Step 1.3: Unify Auth Decorators
- [x] Create `backend/app/platform/auth/decorators.py`
- [x] Implement unified `@authenticated` decorator (replaces `@jwt_required()` + identity extraction)
- [x] Implement unified `@require_roles(*roles)` (exact match, super_admin bypass)
- [x] Implement unified `@require_permission(permission)` (uses RBAC service)
- [x] Implement unified `@require_any_permission(*perms)`
- [x] Implement unified `@require_all_permissions(*perms)`
- [x] Implement unified `@tenant_required` (replaces both `require_tenant_context` and `require_tenant`)
- [x] Deprecation shims: `app/decorators.py` re-exports from `platform/auth/decorators.py` with deprecation warnings
- [ ] **Test:** Every existing endpoint still works with shims
- [ ] **Test:** New decorators enforce correctly

### Step 1.4: Create Unified Identity Resolution
- [x] Create `backend/app/platform/auth/identity.py`
- [x] Define `Identity` dataclass: `user_id`, `email`, `tenant_id`, `roles`, `permissions`
- [x] Implement `get_current_identity() -> Identity` (single source of truth)
- [x] Replace all `get_jwt_identity_dict()` calls across codebase with `get_current_identity()`
- [x] Replace all `g.user_id`, `g.tenant_id`, `g.user_roles` reads with `get_current_identity()`
- [ ] **Test:** Identity resolution works in all API endpoints

### Step 1.5: Move JWT Handlers
- [x] Copy `backend/app/middleware/jwt_handlers.py` → `backend/app/platform/auth/jwt_handler.py`
- [x] Update internal imports within the file
- [x] Update `backend/app/middleware/jwt_handlers.py` to re-export from `platform/auth/jwt_handler.py`
- [ ] **Test:** Token creation, validation, blacklist all work

### Step 1.6: Move Token Service
- [x] Copy `backend/app/services/token_service.py` → `backend/app/platform/auth/token_service.py`
- [x] Update `backend/app/services/token_service.py` to re-export from platform
- [ ] **Test:** Token blacklist and login lockout work

### Step 1.7: Move Tenant Context
- [x] Copy `backend/app/middleware/tenant_context.py` → `backend/app/platform/tenant/context.py`
- [x] Remove duplicate `get_current_user_id()` in the new copy
- [x] Fix f-string SQL injection in `_set_search_path()` — use `quote_ident()`
- [x] Update `backend/app/middleware/tenant_context.py` to re-export from platform
- [ ] **Test:** Tenant context middleware still initializes correctly

### Step 1.8: Move Tenant Schema Utils
- [x] Copy `backend/app/utils/tenant_utils.py` → `backend/app/platform/tenant/schema.py`
- [x] Update `backend/app/utils/tenant_utils.py` to re-export from platform
- [ ] **Test:** Schema name generation and search_path operations work

### Step 1.9: MERGE Encryption Systems (CRITICAL)
- [x] Create `backend/app/platform/security/encryption.py`
- [x] Base on `encryption_service.py` (version-prefixed, PBKDF2 + Fernet)
- [x] Add backward-compatible `decrypt()` that handles all three formats:
  - v1-prefixed (from `encryption_service.py`)
  - base64-wrapped (from `credential_service.py`)
  - raw Fernet (from `utils/encryption.py`)
- [x] All new encryption uses v1-prefix format only
- [x] Add `migrate_ciphertext(old_ciphertext, tenant_id) -> new_ciphertext` utility
- [x] Update `credential_manager.py` to use unified encryption
- [x] Update `encrypted_types.py` to use unified encryption
- [x] Add deprecation warnings to old encryption modules
- [ ] **Test:** Decrypt data encrypted by each of the 3 old systems
- [ ] **Test:** New encryption produces v1-prefixed ciphertext
- [ ] **Test:** Round-trip encrypt/decrypt for all credential types

### Step 1.10: Move Password Service
- [x] Copy `backend/app/services/password_service.py` → `backend/app/platform/security/passwords.py`
- [x] Ensure 12-char minimum + special char requirement
- [x] Update `backend/app/services/password_service.py` to re-export from platform
- [x] Remove duplicated password validation from `auth_service.py` and `user_service.py`
- [ ] **Test:** Password validation consistent everywhere

### Step 1.11: Move Credential Manager
- [x] Copy `backend/app/services/credential_manager.py` → `backend/app/platform/security/credentials.py`
- [x] Refactor to use unified `platform/security/encryption.py`
- [x] Update old file to re-export
- [ ] **Test:** Credential encrypt/decrypt/mask all work

### Step 1.12: Move Audit Service
- [x] Copy `backend/app/services/audit_service.py` → `backend/app/platform/audit/service.py`
- [x] Copy audit decorators from `backend/app/middleware/audit.py` → `backend/app/platform/audit/decorators.py`
- [x] Update old files to re-export
- [ ] **Test:** Audit logging works on all audited endpoints

### Step 1.13: Move Error Handling
- [x] Create `backend/app/platform/errors/exceptions.py` ← content from `errors.py`
- [x] Create `backend/app/platform/errors/handlers.py` ← merge `errors.py` handlers + `middleware/error_handlers.py`
- [x] Remove duplicate 500 handler
- [x] Update old files to re-export
- [ ] **Test:** All error codes return correct HTTP status

### Step 1.14: Move Observability
- [x] Copy `utils/logger.py` → `platform/observability/logging.py`
- [x] Copy `middleware/metrics.py` → `platform/observability/metrics.py`
- [x] Copy `middleware/request_logging.py` → `platform/observability/request_logging.py`
- [x] Fix conflicting `after_request` handler registration
- [x] Update old files to re-export
- [ ] **Test:** Structured logs appear, `/metrics` endpoint works

### Step 1.15: Move Validation Utils
- [x] Copy `utils/validators.py` → `platform/validation/validators.py`
- [x] Copy `utils/pagination.py` → `platform/validation/pagination.py`
- [x] Copy `utils/naming.py` → `platform/validation/naming.py`
- [x] Update old files to re-export
- [ ] **Test:** All validation functions work

### Step 1.16: Standardize Permission Delimiters
- [x] Grep all files for colon-notation permissions (e.g., `'dashboards:create'`)
- [x] Replace all with dot-notation (e.g., `'dashboards.create'`)
- [x] Update RBAC service to remove colon-to-dot compatibility code
- [ ] **Test:** All permission checks still pass

### Step 1.17: Standardize Role Names
- [x] Grep all files for `'admin'` (without prefix) used as role name
- [x] Replace with `'tenant_admin'` or `'super_admin'` as appropriate
- [x] Remove `'platform_admin'` references — standardize to `'super_admin'`
- [x] Remove prefix-matching from `require_roles` (use exact match only)
- [x] Update seed data / migration to use canonical names
- [ ] **Test:** All role-gated endpoints work correctly

### Step 1.18: Update All Imports
- [x] Run project-wide search-and-replace for old import paths
- [x] Ensure all `from app.middleware.*` still work (re-exports)
- [x] Ensure all `from app.services.*` still work (re-exports)
- [x] Ensure all `from app.utils.*` still work (re-exports)
- [ ] **Test:** Full test suite passes
- [ ] **Test:** App starts and all endpoints respond

---

## PHASE 2 — Identity & Access Domain Extraction

### Step 2.1: Create Domain Structure
- [x] Create `backend/app/domains/__init__.py`
- [x] Create `backend/app/domains/identity/__init__.py`
- [x] Create `backend/app/domains/identity/api/__init__.py`
- [x] Create `backend/app/domains/identity/application/__init__.py`
- [x] Create `backend/app/domains/identity/domain/__init__.py`
- [x] Create `backend/app/domains/identity/infrastructure/__init__.py`
- [x] Create `backend/app/domains/identity/schemas/__init__.py`

### Step 2.2: Move Models
- [x] Move User, Role, UserRole → `domains/identity/domain/models.py`
- [x] Move Permission, ResourcePermission, RoleHierarchy → same file
- [x] Keep `app/models/__init__.py` re-exporting for backward compat
- [ ] **Test:** All model imports work, migrations still run

### Step 2.3: Extract Domain Rules
- [x] Create `domains/identity/domain/rules.py`
- [x] Extract permission hierarchy logic from `rbac_service.py`
- [x] Extract wildcard matching logic
- [x] Extract role inheritance logic
- [ ] **Test:** Permission checks produce same results

### Step 2.4: Move Auth Service
- [x] Move `auth_service.py` → `domains/identity/application/auth_service.py`
- [x] Remove direct `Tenant` model queries — use `ITenantResolver` interface
- [x] Remove duplicated password validation — delegate to `platform/security/passwords`
- [x] Keep re-export shim in old location
- [ ] **Test:** Login, register, refresh, logout all work

### Step 2.5: Move User Service
- [x] Move `user_service.py` → `domains/identity/application/user_service.py`
- [x] Remove duplicated `_validate_password_strength()` — use platform password service
- [x] Remove `list_all_users()` classmethod — consolidate into `list_users()` instance method
- [x] Remove inline permission building — delegate to `rbac_service`
- [x] Keep re-export shim
- [ ] **Test:** User CRUD, role assignment, password change all work

### Step 2.6: Move RBAC Service
- [x] Move `rbac_service.py` → `domains/identity/application/rbac_service.py`
- [x] Replace in-memory permission cache with Redis-backed cache
- [x] Add cache TTL (5 minutes)
- [x] Keep re-export shim
- [ ] **Test:** Permission checks, role CRUD, hierarchy all work
- [ ] **Test:** Cache invalidation on role/permission change

### Step 2.7: Create RoleService (NEW — Fix Dead Code)
- [x] Create `domains/identity/application/role_service.py`
- [x] Extract all SQLAlchemy logic from `api/v1/roles.py` into service methods
- [x] Methods: `list_roles()`, `get_role()`, `create_role()`, `update_role()`, `delete_role()`, `list_permissions()`, `list_system_permissions()`, `assign_permission()`
- [ ] **Test:** All role CRUD operations work through service

### Step 2.8: Move API Routes
- [x] Move `api/v1/auth.py` → `domains/identity/api/auth_routes.py`
- [x] Move `api/v1/users.py` → `domains/identity/api/user_routes.py`
- [x] Move `api/v1/roles.py` → `domains/identity/api/role_routes.py`
- [x] Refactor `auth_routes.py`: remove direct User model access (lines 155-166), move to auth_service
- [x] Refactor `role_routes.py`: replace all direct model access with RoleService calls
- [x] Update `api/v1/__init__.py` to import from domains
- [ ] **Test:** All auth, user, role endpoints work with new paths

### Step 2.9: Move Schemas
- [x] Move `schemas/auth_schemas.py` → `domains/identity/schemas/`
- [x] Move `schemas/user_schemas.py` → `domains/identity/schemas/`
- [x] Move `schemas/role_schemas.py` → `domains/identity/schemas/`
- [x] Keep re-export shims
- [ ] **Test:** Request validation still works

---

## PHASE 3 — Tenant Management Domain Extraction

### Step 3.1: Create Domain Structure
- [x] Create `backend/app/domains/tenants/` with api/, application/, domain/, infrastructure/, schemas/ subdirs

### Step 3.2: Move Models
- [x] Move Tenant, TenantStatus, SubscriptionPlan → `domains/tenants/domain/models.py`
- [x] Move InfrastructureConfig → `domains/tenants/domain/models.py`
- [x] Keep re-export shims
- [ ] **Test:** Models import correctly

### Step 3.3: Extract Provisioning
- [x] Create `domains/tenants/infrastructure/provisioning.py`
- [x] Extract PG schema creation from `tenant_service.py` → provisioning
- [x] Extract ClickHouse database creation from `tenant_service.py` → provisioning
- [x] Tenant service calls provisioning service (not inline SQL)
- [ ] **Test:** Tenant provisioning creates PG schema + CH database

### Step 3.4: Move Services
- [x] Move `tenant_service.py` → `domains/tenants/application/tenant_service.py`
- [x] Move `infrastructure_config_service.py` → `domains/tenants/infrastructure/config_service.py`
- [x] Remove duplicate `suspend_tenant`/`deactivate_tenant` — keep only one
- [x] Keep re-export shims
- [ ] **Test:** Tenant CRUD, provisioning, config management work

### Step 3.5: Merge Tenant APIs
- [x] Move `api/v1/tenants.py` → `domains/tenants/api/tenant_routes.py`
- [x] Merge `api/v1/admin/tenants.py` logic into same file with `@require_roles(['super_admin'])` on admin endpoints
- [x] Extract direct SQLAlchemy from admin tenants into `tenant_service`
- [x] Update blueprint registration
- [ ] **Test:** Both regular and admin tenant endpoints work

### Step 3.6: Move Schemas
- [x] Move `schemas/tenant_schemas.py` → `domains/tenants/schemas/`
- [x] Move `schemas/infrastructure_schemas.py` → `domains/tenants/schemas/`

---

## PHASE 4 — Data Sources Domain Extraction

### Step 4.1-4.8: (Follow same pattern as above)
- [ ] Create domain structure
- [ ] Move DataConnection model (adopt TenantMixin)
- [ ] Merge duplicate DTOs (connectors + data_source)
- [ ] Move connectors/ → infrastructure/connectors/
- [ ] Move connection_service → application/
- [ ] Refactor to use unified encryption
- [ ] Remove dual response format
- [ ] Move routes and schemas

---

## PHASE 5 — Orchestration Domain Extraction

### Step 5.1-5.6: (Follow same pattern)
- [ ] Create domain structure
- [ ] Move DAG models (adopt TenantMixin, TimestampMixin)
- [ ] Move dag_service, pipeline_generator → application/
- [ ] Move dag_validator → domain/validators.py
- [ ] Move dag_generator, airflow_client, transformation_dag_generator → infrastructure/
- [ ] Move routes and schemas

---

## PHASE 6 — Remaining Domains

### Step 6.1: Analytics Domain
- [ ] Move Dashboard, Widget → domain/ (keep TenantMixin usage)
- [ ] Move dashboard_service → application/ — remove model-level authz
- [ ] Move query_builder, clickhouse_client → infrastructure/
- [ ] Route authz through RBAC service instead of `dashboard.can_view()`

### Step 6.2: Transformation Domain
- [ ] Move Semantic models → domain/
- [ ] Move semantic_service, dbt_service → application/
- [ ] Move dbt_model_generator → infrastructure/
- [ ] Add permission checks to semantic endpoints

### Step 6.3: Compute Domain
- [ ] Move PySparkApp model → domain/ (adopt TenantMixin)
- [ ] Move pyspark_app_service → application/

### Step 6.4: AI Domain
- [ ] Move nl_to_sql → application/
- [ ] Move ollama/ → infrastructure/
- [ ] Deduplicate JSON parsing between ollama modules

---

## PHASE 7 — Dead Code & Cleanup

- [ ] Delete `app/decorators.py` (now in platform/)
- [ ] Delete `app/utils/encryption.py` (merged into platform/)
- [ ] Delete `app/services/credential_service.py` (merged)
- [ ] Delete `check_user.py`
- [ ] Remove empty `db` CLI command group from `commands.py`
- [ ] Remove dead `SoftDeleteMixin` event listener
- [ ] Remove dead `ColumnDataType` enum
- [ ] Remove dead `ModelType` enum
- [ ] Remove `backup.py` API + `backup_service.py` if not in scope
- [ ] Clean up all re-export shims (remove after verifying no external consumers)
- [ ] Delete empty `app/middleware/` directory
- [ ] Delete empty `app/utils/` directory
- [ ] Delete empty `app/services/` directory
- [ ] Delete empty `app/models/` directory
- [ ] Delete empty `app/schemas/` directory

---

## PHASE 8 — Cross-Domain Interfaces

- [ ] Define `IAccessChecker` interface in `platform/auth/interfaces.py`
- [ ] Define `ITenantResolver` interface in `platform/tenant/interfaces.py`
- [ ] Define `IConnectionProvider` in `domains/datasources/domain/interfaces.py`
- [ ] Define `ISchemaProvider` in `domains/datasources/domain/interfaces.py`
- [ ] Define `ISemanticLayerProvider` in `domains/transformation/domain/interfaces.py`
- [ ] Implement interfaces in respective infrastructure layers
- [ ] Add import linting: no `from app.domains.X.domain` in `app.domains.Y`
- [ ] **Test:** Cross-domain calls work through interfaces only

---

## PHASE 9 — Test Restructuring

- [ ] Create `tests/platform/` mirroring platform structure
- [ ] Create `tests/domains/identity/`, `tests/domains/tenants/`, etc.
- [ ] Add auth enforcement test: every endpoint returns 401 without token
- [ ] Add tenant isolation test: tenant A cannot see tenant B data
- [ ] Add encryption migration test: old ciphertext decrypted correctly
- [ ] Add integration tests for each cross-domain interface
- [ ] Achieve 80%+ coverage on platform/ and all domain application layers

---

## Completion Criteria

- [ ] Zero imports of `flask_jwt_extended` outside `platform/auth/`
- [ ] Zero direct `g.tenant_id` reads outside `platform/tenant/`
- [ ] Zero `db.session.query()` calls in API layer
- [ ] Zero duplicated auth/tenant logic
- [ ] Single encryption system
- [ ] Single password policy
- [ ] Single permission resolution system
- [ ] Every non-public endpoint has auth + tenant decorators
- [ ] All tests pass
- [ ] App starts and all endpoints respond correctly

---

*Checklist v1.0 — Generated 2026-02-07*
