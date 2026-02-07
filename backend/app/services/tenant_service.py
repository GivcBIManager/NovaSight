"""
NovaSight Tenant Service  SHIM
=================================

.. deprecated::
    This module re-exports from `app.domains.tenants.application.tenant_service`.
    Import directly from the canonical location.
"""

import warnings as _w
_w.warn(
    "app.services.tenant_service is deprecated; use app.domains.tenants.application.tenant_service",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.tenants.application.tenant_service import TenantService  # noqa: F401
