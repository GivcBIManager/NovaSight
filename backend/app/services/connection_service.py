"""
NovaSight Connection Service — Re-export Shim
===============================================

.. deprecated::
    Import from ``app.domains.datasources.application.connection_service`` instead.

This module re-exports ``ConnectionService`` from its canonical location
in the data sources domain for backward compatibility.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.services.connection_service' is deprecated. "
    "Use 'app.domains.datasources.application.connection_service' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.datasources.application.connection_service import ConnectionService  # noqa: F401, E402

__all__ = ["ConnectionService"]


# Removed: original class ConnectionService
