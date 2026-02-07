"""
NovaSight RBAC Models - SHIM
=============================

DEPRECATED: Import from ``app.domains.identity.domain.models`` instead.

This module re-exports RBAC models for backward compatibility.
"""
import warnings as _w
_w.warn(
    "Importing from app.models.rbac is deprecated. "
    "Use app.domains.identity.domain.models instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.identity.domain.models import (  # noqa: F401
    Permission,
    ResourcePermission,
    RoleHierarchy,
    role_permissions,
    get_all_permissions,
    get_role_hierarchy_level,
)

__all__ = [
    "Permission",
    "ResourcePermission",
    "RoleHierarchy",
    "role_permissions",
    "get_all_permissions",
    "get_role_hierarchy_level",
]
