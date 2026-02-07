"""
NovaSight Auth Schemas  SHIM
================================

.. deprecated::
    This module re-exports from `app.domains.identity.schemas.auth_schemas`.
    Import directly from the canonical location.
"""

import warnings as _w
_w.warn(
    "app.schemas.auth_schemas is deprecated; use app.domains.identity.schemas.auth_schemas",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.identity.schemas.auth_schemas import (  # noqa: F401
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserInfo,
    LoginResponse,
)
