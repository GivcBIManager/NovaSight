"""
dbt Service for NovaSight
==========================

Provides dbt command execution with multi-tenant context support.

.. deprecated::
    This module is a backward-compatibility shim.
    Use `app.domains.transformation.application.dbt_service` instead.
"""

import warnings as _warnings

_warnings.warn(
    "app.services.dbt_service is deprecated. "
    "Use app.domains.transformation.application.dbt_service instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.transformation.application.dbt_service import (  # noqa: F401, E402
    DbtCommand,
    DbtResult,
    DbtService,
    get_dbt_service,
)

__all__ = [
    "DbtCommand",
    "DbtResult",
    "DbtService",
    "get_dbt_service",
]
