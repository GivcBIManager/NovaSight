"""
NovaSight JWT Handlers
======================

Flask-JWT-Extended callback handlers for token validation.

.. deprecated::
    This module is a backward-compatibility shim.
    Import from ``app.platform.auth.jwt_handler`` instead.
"""

import warnings

# Re-export everything from the canonical location
from app.platform.auth.jwt_handler import (   # noqa: F401
    serialize_identity as _serialize_identity,
    deserialize_identity as _deserialize_identity,
    get_jwt_identity_dict,
    register_jwt_handlers,
    init_jwt_handlers,
)

import logging

logger = logging.getLogger(__name__)


def _emit_deprecation(name: str):
    warnings.warn(
        f"app.middleware.jwt_handlers.{name} is deprecated. "
        "Import from app.platform.auth.jwt_handler instead.",
        DeprecationWarning,
        stacklevel=3,
    )
