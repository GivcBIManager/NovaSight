"""
NovaSight User Endpoints  SHIM
=================================

.. deprecated::
    This module re-exports from `app.domains.identity.api.user_routes`.
    Import directly from the canonical location.
"""

import warnings as _w
_w.warn(
    "app.api.v1.users is deprecated; use app.domains.identity.api.user_routes",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.identity.api.user_routes import *  # noqa: F401,F403
