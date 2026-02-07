"""
NovaSight Tenant Utilities
==========================

Helper functions for tenant management and schema operations.

.. deprecated::
    This module is a backward-compatibility shim.
    Import from ``app.platform.tenant.schema`` instead.
"""

# Re-export everything from the canonical location
from app.platform.tenant.schema import (   # noqa: F401
    get_tenant_schema_name,
    create_tenant_schema,
    drop_tenant_schema,
    schema_exists,
    list_tenant_schemas,
    set_search_path,
    reset_search_path,
    execute_in_tenant_context,
    get_current_tenant_schema,
    validate_tenant_access,
    TenantSchemaContext,
)

