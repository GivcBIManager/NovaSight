"""
NovaSight User Service - SHIM
==============================

DEPRECATED: Import from ``app.domains.identity.application.user_service`` instead.
"""
import warnings as _w
_w.warn(
    "Importing from app.services.user_service is deprecated. "
    "Use app.domains.identity.application.user_service instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.identity.application.user_service import UserService  # noqa: F401

__all__ = ["UserService"]
