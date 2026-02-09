"""
Platform Tenant Module
======================

Tenant context resolution, schema isolation, tenant utilities.
"""

from app.platform.tenant.schema import (
    get_tenant_schema_name,
    create_tenant_schema,
)
from app.platform.tenant.isolation import (
    TenantIsolationService,
    TenantIsolationError,
    get_current_tenant_isolation,
    require_tenant_isolation,
)

__all__ = [
    "get_tenant_schema_name",
    "create_tenant_schema",
    "TenantIsolationService",
    "TenantIsolationError",
    "get_current_tenant_isolation",
    "require_tenant_isolation",
]
