"""
NovaSight Admin Tenant API  SHIM
===================================

.. deprecated::
    Admin tenant routes are now in `app.domains.tenants.api.tenant_routes`.
    Import directly from the canonical location.
"""

import warnings as _w
_w.warn(
    "app.api.v1.admin.tenants is deprecated; use app.domains.tenants.api.tenant_routes",
    DeprecationWarning,
    stacklevel=2,
)

# Admin routes are registered on admin_bp by tenant_routes module.
# This shim exists only for backward-compat imports.
from app.domains.tenants.api.tenant_routes import *  # noqa: F401,F403
