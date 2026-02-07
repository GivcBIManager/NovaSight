"""
NovaSight Tenant Context Middleware
===================================

Middleware for extracting and validating tenant context from requests.
Ensures complete data isolation between tenants.

.. deprecated::
    This module is a backward-compatibility shim.
    Import from ``app.platform.tenant.context`` instead.
"""

# Re-export everything from the canonical location
from app.platform.tenant.context import (   # noqa: F401
    TenantContextMiddleware,
    require_tenant,
    get_current_tenant,
    get_current_tenant_id,
    get_current_user_id,
    get_user_roles,
    get_user_permissions,
)

# Legacy constant re-exports (now live in platform/auth/constants)
from app.platform.auth.constants import (   # noqa: F401
    PUBLIC_ENDPOINTS,
    PUBLIC_PATH_PREFIXES,
)


def get_current_tenant_slug():
    """Get the current tenant slug from request context."""
    from flask import g
    return getattr(g, 'tenant_slug', None)

