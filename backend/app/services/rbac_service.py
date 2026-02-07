"""
NovaSight RBAC Service - SHIM
==============================

DEPRECATED: Import from ``app.domains.identity.application.rbac_service`` instead.
"""
import warnings as _w
_w.warn(
    "Importing from app.services.rbac_service is deprecated. "
    "Use app.domains.identity.application.rbac_service instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.identity.application.rbac_service import (  # noqa: F401
    RBACService,
    rbac_service,
)

__all__ = ["RBACService", "rbac_service"]
