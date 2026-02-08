"""
Backward-compatible shim for ``app.services.dag_service``.

.. deprecated::
    Import from ``app.domains.orchestration.application.dag_service`` instead.
"""

import warnings as _warnings

_warnings.warn(
    "Importing from 'app.services.dag_service' is deprecated. "
    "Use 'app.domains.orchestration.application.dag_service' instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.domains.orchestration.application.dag_service import (  # noqa: F401
    DagService,
)

__all__ = [
    "DagService",
]
