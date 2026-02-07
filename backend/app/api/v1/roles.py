"""
NovaSight Role Endpoints  SHIM
=================================

.. deprecated::
    This module re-exports from `app.domains.identity.api.role_routes`.
    Import directly from the canonical location.
"""

import warnings as _w
_w.warn(
    "app.api.v1.roles is deprecated; use app.domains.identity.api.role_routes",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.identity.api.role_routes import *  # noqa: F401,F403
