"""
NovaSight Role Schemas  SHIM
================================

.. deprecated::
    This module re-exports from `app.domains.identity.schemas.role_schemas`.
    Import directly from the canonical location.
"""

import warnings as _w
_w.warn(
    "app.schemas.role_schemas is deprecated; use app.domains.identity.schemas.role_schemas",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.identity.schemas.role_schemas import (  # noqa: F401
    AVAILABLE_PERMISSIONS,
    PermissionSchema,
    RoleSchema,
    RoleCreateSchema,
    RoleUpdateSchema,
    RoleListSchema,
    PermissionListSchema,
    DEFAULT_ROLE_TEMPLATES,
)
