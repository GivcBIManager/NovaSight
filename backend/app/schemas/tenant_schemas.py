"""
NovaSight Tenant Schemas  SHIM
=================================

.. deprecated::
    This module re-exports from `app.domains.tenants.schemas.tenant_schemas`.
    Import directly from the canonical location.
"""

import warnings as _w
_w.warn(
    "app.schemas.tenant_schemas is deprecated; use app.domains.tenants.schemas.tenant_schemas",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.tenants.schemas.tenant_schemas import (  # noqa: F401
    TenantSchema,
    TenantCreateSchema,
    TenantUpdateSchema,
    TenantListSchema,
    TenantUsageSchema,
    TenantProvisioningStatusSchema,
)
