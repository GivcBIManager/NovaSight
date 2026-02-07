"""
NovaSight Tenant Model  SHIM
===============================

.. deprecated::
    This module re-exports from `app.domains.tenants.domain.models`.
    Import directly from the canonical location.
"""

import warnings as _w
_w.warn(
    "app.models.tenant is deprecated; use app.domains.tenants.domain.models",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.tenants.domain.models import (  # noqa: F401
    Tenant,
    TenantStatus,
    SubscriptionPlan,
)
