"""
NovaSight Authentication Service - SHIM
========================================

DEPRECATED: Import from ``app.domains.identity.application.auth_service`` instead.
"""
import warnings as _w
_w.warn(
    "Importing from app.services.auth_service is deprecated. "
    "Use app.domains.identity.application.auth_service instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.identity.application.auth_service import AuthService  # noqa: F401

__all__ = ["AuthService"]
