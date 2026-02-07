"""
NovaSight Tenant Endpoints  SHIM
===================================

.. deprecated::
    This module re-exports from `app.domains.tenants.api.tenant_routes`.
    Import directly from the canonical location.
"""

import warnings as _w
_w.warn(
    "app.api.v1.tenants is deprecated; use app.domains.tenants.api.tenant_routes",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.tenants.api.tenant_routes import *  # noqa: F401,F403
