"""
NovaSight User Models - SHIM
=============================

DEPRECATED: Import from ``app.domains.identity.domain.models`` instead.

This module re-exports identity models for backward compatibility.
All canonical definitions now live in the identity domain.
"""
import warnings as _w
_w.warn(
    "Importing from app.models.user is deprecated. "
    "Use app.domains.identity.domain.models instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.identity.domain.models import (  # noqa: F401
    UserStatus,
    user_roles,
    Role,
    UserRole,
    User,
)

__all__ = [
    "UserStatus",
    "user_roles",
    "Role",
    "UserRole",
    "User",
]
