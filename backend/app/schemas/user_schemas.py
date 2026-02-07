"""
NovaSight User Schemas  SHIM
================================

.. deprecated::
    This module re-exports from `app.domains.identity.schemas.user_schemas`.
    Import directly from the canonical location.
"""

import warnings as _w
_w.warn(
    "app.schemas.user_schemas is deprecated; use app.domains.identity.schemas.user_schemas",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.identity.schemas.user_schemas import (  # noqa: F401
    RoleSchema,
    UserSchema,
    UserCreateSchema,
    UserUpdateSchema,
    UserListSchema,
    UserPermissionsSchema,
    AssignRolesSchema,
    ChangePasswordSchema,
)
